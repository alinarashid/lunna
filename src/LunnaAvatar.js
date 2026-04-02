// LunnaAvatar — renders the Lunna mascot image.
// Accepts a `size` prop (width and height in px, default 70).
// The image file lives at public/lunna_mascot.png.
import React from 'react';

const LunnaAvatar = ({ size = 70 }) => (
  <img
    src="/lunna_mascot.png"
    alt="lunna"
    width={size}
    height={size}
    style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
  />
);

export default LunnaAvatar;
