export type Lang = 'pt' | 'en' | 'es' | 'de'

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'de', label: 'DE' },
]

export type HelpText = {
  heading: string
  version: string
  items: { label: string; text: string }[]
}

export const HELP: Record<Lang, HelpText> = {
  pt: {
    heading: 'Como usar',
    version: 'Versão',
    items: [
      { label: 'Girar:', text: 'arraste a borda externa do disco, ou use as setas ← e → (com Shift, passo de 10°).' },
      { label: 'Mover o transferidor:', text: 'arraste o miolo do disco, por cima do que estiver atrás.' },
      { label: 'Mover a janela:', text: 'segure Option (⌥) e arraste sobre o transferidor.' },
      { label: 'Redimensionar:', text: 'arraste a borda da janela; o transferidor acompanha o tamanho.' },
      { label: 'Seta vermelha:', text: 'aponta para onde está o mouse, e o avião segue essa direção.' },
      { label: 'Mostrador:', text: 'o número abaixo do miolo é o grau da escala sob a seta.' },
      { label: 'Fechar este painel:', text: 'tecla Esc ou o botão ×.' },
    ],
  },
  en: {
    heading: 'How to use',
    version: 'Version',
    items: [
      { label: 'Rotate:', text: 'drag the outer edge of the dial, or use the ← and → arrow keys (with Shift, 10° steps).' },
      { label: 'Move the protractor:', text: 'drag the center of the dial, over whatever is behind it.' },
      { label: 'Move the window:', text: 'hold Option (⌥) and drag over the protractor.' },
      { label: 'Resize:', text: 'drag the window edge; the protractor follows the size.' },
      { label: 'Red arrow:', text: 'points where the mouse is, and the plane follows that direction.' },
      { label: 'Readout:', text: 'the number below the center is the degree on the scale under the arrow.' },
      { label: 'Close this panel:', text: 'Esc key or the × button.' },
    ],
  },
  es: {
    heading: 'Cómo usar',
    version: 'Versión',
    items: [
      { label: 'Girar:', text: 'arrastra el borde exterior del disco, o usa las flechas ← y → (con Shift, pasos de 10°).' },
      { label: 'Mover el transportador:', text: 'arrastra el centro del disco, por encima de lo que esté detrás.' },
      { label: 'Mover la ventana:', text: 'mantén Option (⌥) y arrastra sobre el transportador.' },
      { label: 'Redimensionar:', text: 'arrastra el borde de la ventana; el transportador acompaña el tamaño.' },
      { label: 'Flecha roja:', text: 'apunta hacia donde está el mouse, y el avión sigue esa dirección.' },
      { label: 'Lectura:', text: 'el número debajo del centro es el grado de la escala bajo la flecha.' },
      { label: 'Cerrar este panel:', text: 'tecla Esc o el botón ×.' },
    ],
  },
  de: {
    heading: 'Bedienung',
    version: 'Version',
    items: [
      { label: 'Drehen:', text: 'den äußeren Rand der Scheibe ziehen oder die Pfeiltasten ← und → verwenden (mit Umschalt: 10°-Schritte).' },
      { label: 'Winkelmesser verschieben:', text: 'an der Mitte der Scheibe ziehen, über alles, was dahinter liegt.' },
      { label: 'Fenster verschieben:', text: 'Wahltaste (⌥) gedrückt halten und über dem Winkelmesser ziehen.' },
      { label: 'Größe ändern:', text: 'am Fensterrand ziehen; der Winkelmesser passt sich der Größe an.' },
      { label: 'Roter Pfeil:', text: 'zeigt auf die Mausposition, und das Flugzeug folgt dieser Richtung.' },
      { label: 'Anzeige:', text: 'die Zahl unter der Mitte ist der Grad der Skala unter dem Pfeil.' },
      { label: 'Dieses Fenster schließen:', text: 'Esc-Taste oder die ×-Schaltfläche.' },
    ],
  },
}
