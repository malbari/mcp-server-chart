const express = require("express");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json({ limit: "10mb" }));

// Directory for generated chart images
const IMAGES_DIR = path.join(__dirname, "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Serve generated images as static files
app.use("/images", express.static(IMAGES_DIR));

// Base URL for image links (configurable via env)
const PUBLIC_HOST =
  process.env.PUBLIC_HOST || `http://localhost:${process.env.PORT || 3200}`;

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /render
 *
 * Expected body: { type: "line", data: [...], ...otherOptions }
 * Response: { success: boolean, resultObj: string, errorMessage: string }
 *
 * This is the API contract expected by mcp-server-chart when using
 * the VIS_REQUEST_SERVER environment variable.
 */
app.post("/render", async (req, res) => {
  try {
    const options = req.body;

    if (!options || !options.type) {
      return res.json({
        success: false,
        resultObj: "",
        errorMessage: "Missing required field: type",
      });
    }

    console.log(
      `[render] Rendering chart type="${options.type}" ...`
    );

    // Dynamically import ESM module
    const { render } = await import("@antv/gpt-vis-ssr");

    const vis = await render(options);
    const buffer = vis.toBuffer();
    vis.destroy();

    // Save the image to disk
    const filename = `${uuidv4()}.png`;
    const filepath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `${PUBLIC_HOST}/images/${filename}`;

    console.log(`[render] Chart generated: ${imageUrl}`);

    res.json({
      success: true,
      resultObj: imageUrl,
      errorMessage: "",
    });
  } catch (error) {
    console.error(`[render] Error:`, error);
    res.json({
      success: false,
      resultObj: "",
      errorMessage: error.message || "Unknown rendering error",
    });
  }
});

/**
 * POST / (root) — alias for /render
 * The mcp-server-chart may call the root URL directly depending on
 * how VIS_REQUEST_SERVER is configured.
 */
app.post("/", async (req, res) => {
  // Forward to /render handler
  req.url = "/render";
  app.handle(req, res);
});

// Periodic cleanup: remove images older than 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    const now = Date.now();
    let cleaned = 0;
    for (const file of files) {
      const filePath = path.join(IMAGES_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[cleanup] Removed ${cleaned} old image(s)`);
    }
  } catch (err) {
    console.error("[cleanup] Error:", err);
  }
}, CLEANUP_INTERVAL_MS);

// Start server
const PORT = process.env.PORT || 3200;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`GPT-Vis-SSR server listening on http://0.0.0.0:${PORT}`);
  console.log(`Public host for image URLs: ${PUBLIC_HOST}`);
});
