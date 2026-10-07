// Se o agente não conseguiu reportar ao vivo, os achados são lidos do relatório: "- <gravidade> (confirmado|suspeita): texto".
const SEV = [['crit', /cr[ií]tic|crit/i], ['alto', /alt[oa]/i], ['medio', /m[eé]di[oa]/i], ['baixo', /baix[oa]/i]];
export function achadosDoRelatorio(md) {
  const sec = (md.split(/^##\s*Achados.*$/im)[1] || '').split(/^##\s/m)[0], out = [];
  for (const l of sec.split('\n')) {
    const m = l.match(/^\s*(?:[-*]|\d+[.)])\s*\**\s*([^:(,*]+?)\s*[,(]?\s*\**\s*(confirmad[oa]|suspeita)?\)?\s*\**\s*[:,-]\s*(.+)$/i);
    if (!m || /^sem achado/i.test(m[1])) continue;
    const sev = (SEV.find(([, r]) => r.test(m[1])) || [])[0]; if (!sev) continue;
    out.push({ sev, texto: m[3].replace(/[*`]/g, '').slice(0, 120), confirmado: !/suspeita/i.test(m[2] || l) });
  }
  return out;
}
