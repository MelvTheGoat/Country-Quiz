/**
 * Sharing helpers: Web Share API where it exists, clipboard everywhere else,
 * plus an optional PNG render of the result card.
 */
import { toPng } from 'html-to-image';

export async function shareText({ title = 'Capitals Quiz', text, url }) {
  const payload = { title, text, ...(url ? { url } : {}) };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // fall through to the clipboard
    }
  }
  return copyText(url ? `${text}\n${url}` : text);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return legacyCopy(text) ? 'copied' : 'failed';
  }
}

function legacyCopy(text) {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Renders a DOM node to a PNG and shares it, falling back to a download. */
export async function shareCardImage(node, { fileName = 'capitals-quiz.png', text } = {}) {
  if (!node) return 'failed';
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
  });

  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'Capitals Quiz' });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
  return 'downloaded';
}

export function soloShareText({ playerName, score, total, accuracy, label, seconds }) {
  return `${playerName} scored ${score}/${total} (${accuracy}%) in Capitals Quiz — ${label} edition, in ${seconds}. 🌍`;
}

export function matchShareText({ me, opponent, label }) {
  const verb = me.score > opponent.score ? 'beat' : me.score === opponent.score ? 'drew with' : 'lost to';
  const scoreline =
    me.score === opponent.score
      ? `${me.score}-${opponent.score}`
      : `${Math.max(me.score, opponent.score)}-${Math.min(me.score, opponent.score)}`;
  return `I ${verb} ${opponent.name} ${scoreline} in Capitals Quiz — ${label} edition! 🌍`;
}
