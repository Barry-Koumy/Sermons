// Préparation du HTML d'un sermon (converti depuis PDF) pour l'affichage et la
// sauvegarde hors-ligne. Partagé entre le lecteur (affichage distant) et le hook de
// téléchargement (pré-traitement avant stockage), afin que le contenu enregistré
// hors-ligne soit identique à celui affiché en ligne (mêmes ids de section).

export interface PreparedHtml {
  innerHtml: string;
  sections: string[];
}

/**
 * Extrait le HTML intérieur de `.pdf-container` depuis un document HTML complet.
 * Ajoute des ids aux `.titre-principal` pour permettre la navigation par sommaire.
 */
export function prepareHtmlContent(rawHtml: string): PreparedHtml {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const container = doc.querySelector('.pdf-container') ?? doc.body;

  const sections: string[] = [];
  container.querySelectorAll<HTMLElement>('.titre-principal').forEach((el, i) => {
    sections.push(el.textContent?.trim() ?? '');
    el.id = `section-${i}`;
  });

  return { innerHtml: container.innerHTML, sections };
}
