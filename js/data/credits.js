/*
 * CREDITS — edit the names here. {name} placeholders are filled from PEOPLE.
 */
(function (ERX) {
  'use strict';

  ERX.Data = ERX.Data || {};

  const PEOPLE = {
    developer: '[Developer]',
  };

  ERX.Data.credits = {
    people: PEOPLE,
    roll: [
      { logo: true },
      { gap: 18 },
      { heading: 'CREATED BY', names: ['{developer}'] },
      { heading: 'PROGRAMMING', names: ['{developer}'] },
      { heading: 'ART', names: ['{developer}'] },
      { heading: 'MUSIC', names: ['{developer}'] },
      { heading: 'SPECIAL THANKS', names: ['Everyone who somehow survived the tutorial.'] },
      { gap: 8 },
      { heading: 'ALSO STARRING', names: ['The person under the Great Tree', 'The blacksmith who never stops hammering', 'A suspiciously large sky whale', 'One chicken (uncredited)'] },
      { heading: 'BUILT WITH', names: ['HTML5 Canvas', 'The Web Audio API', 'An unreasonable number of pixels'] },
      { gap: 24 },
      { note: 'No elements were chosen in the making of this game.' },
      { gap: 6 },
      { note: 'Thank you for playing. Well. For menuing.' },
      { gap: 60 },
    ],
  };
})(window.ERX = window.ERX || {});
