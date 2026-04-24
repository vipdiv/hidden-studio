/* ═══════════════════════════════════════════════════
   EASTER EGG TEMPLATES
   Starter configs the designer can clone onto a hit zone.
   audio/image are null until the designer uploads files.
═══════════════════════════════════════════════════ */

window.EASTER_EGG_TEMPLATES = [
  {
    templateId: 'rickroll',
    name: 'Rickroll',
    audio: null,
    audioName: '',
    loop: true,
    visualType: 'floating',
    visualContent: {
      image: null,
      imageName: '',
      text: '',
      position: 'center',
      duration: null,
    },
    dismissable: true,
  },
  {
    templateId: 'jurassic',
    name: 'Ah ah ah…',
    audio: null,
    audioName: '',
    loop: false,
    visualType: 'shake',
    visualContent: {
      image: null,
      imageName: '',
      text: "Ah ah ah, you didn't say the magic word!",
      position: 'center',
      duration: null,
    },
    dismissable: false,
  },
];
