#!/bin/bash
# sync-upstream.sh
#
# Sincronizza il repository locale con il repository upstream originale
# (su cui non si ha accesso in scrittura), mantenendo origin come il
# proprio fork personale per i commit futuri.
#
# Upstream: https://github.com/antvis/mcp-server-chart (repo originale)
# Origin:   https://github.com/malbari/mcp-server-chart (il tuo fork)
#
# Uso:
#   ./sync-upstream.sh              # sync del branch main
#   ./sync-upstream.sh develop      # sync di un branch specifico

set -euo pipefail

UPSTREAM_URL="https://github.com/antvis/mcp-server-chart.git"
BRANCH="${1:-main}"

echo "=== Sync upstream → ${BRANCH} ==="

# 1. Aggiungi il remote upstream se non esiste già
if ! git remote get-url upstream &>/dev/null; then
    echo "[+] Aggiungo remote 'upstream' → ${UPSTREAM_URL}"
    git remote add upstream "${UPSTREAM_URL}"
else
    echo "[✓] Remote 'upstream' già configurato: $(git remote get-url upstream)"
fi

# 2. Salva eventuali modifiche locali non committate
STASHED=false
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "[~] Salvo modifiche locali in stash..."
    git stash push -m "sync-upstream: auto-stash $(date +%Y%m%d-%H%M%S)"
    STASHED=true
fi

# 3. Assicurati di essere sul branch corretto
CURRENT_BRANCH=$(git branch --show-current)
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
    echo "[~] Cambio branch: ${CURRENT_BRANCH} → ${BRANCH}"
    git checkout "${BRANCH}"
fi

# 4. Fetch dal repository upstream
echo "[↓] Fetch da upstream..."
git fetch upstream

# 5. Merge (o rebase) delle modifiche upstream
echo "[⇄] Rebase di ${BRANCH} su upstream/${BRANCH}..."
if git rebase "upstream/${BRANCH}"; then
    echo "[✓] Rebase completato con successo"
else
    echo "[!] Conflitti durante il rebase. Risolvi manualmente, poi:"
    echo "    git rebase --continue"
    echo "    git push origin ${BRANCH}"
    exit 1
fi

# 6. Push sul proprio fork (origin)
echo "[↑] Push su origin/${BRANCH}..."
git push origin "${BRANCH}"

# 7. Ripristina eventuali modifiche locali
if [[ "${STASHED}" == true ]]; then
    echo "[~] Ripristino modifiche locali dallo stash..."
    git stash pop
fi

echo ""
echo "=== Sync completato ==="
echo "  upstream/${BRANCH} → local/${BRANCH} → origin/${BRANCH}"
echo ""
echo "I prossimi commit andranno su: origin ($(git remote get-url origin))"
