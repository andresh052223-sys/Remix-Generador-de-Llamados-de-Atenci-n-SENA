// Official SENA Logo vector definition and high-DPI canvas rasterizer
export const SENA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 350" width="320" height="350">
  <g fill="#39A900">
    <!-- 1. Head (Solid Circle) -->
    <circle cx="160" cy="46" r="30" />

    <!-- 2. Text: SENA -->
    <!-- Letter S -->
    <path d="M 64 128 C 64 108 80 98 103 98 C 122 98 135 106 137 118 L 117 122 C 115 116 111 112 103 112 C 95 112 88 116 88 122 C 88 128 94 130 106 133 C 125 137 139 143 139 157 C 139 171 126 180 103 180 C 80 180 65 171 63 154 L 84 150 C 86 160 93 166 103 166 C 112 166 117 162 117 156 C 117 150 111 147 98 144 C 79 140 64 135 64 128 Z" />
    
    <!-- Letter E -->
    <path d="M 148 100 H 188 V 114 H 164 V 132 H 184 V 146 H 164 V 164 H 189 V 178 H 148 Z" />
    
    <!-- Letter N -->
    <path d="M 198 100 H 215 L 235 152 V 100 H 250 V 178 H 233 L 213 126 V 178 H 198 Z" />
    
    <!-- Letter A -->
    <path d="M 270 100 H 288 L 309 178 H 291 L 286 160 H 270 L 265 178 H 248 Z M 274 146 H 282 L 278 124 Z" />

    <!-- 3. SENA Body / Arms / Chevron Figure -->
    <!-- Horizontal Arms & Torso -->
    <path d="M 24 190 H 296 V 218 H 252 L 296 308 L 260 328 L 222 248 L 160 338 L 98 248 L 60 328 L 24 308 L 68 218 H 24 Z" />
  </g>
  <!-- Cutout slits for the iconic inner chevron of SENA -->
  <g fill="#FFFFFF">
    <polygon points="160,230 188,278 214,230" />
    <polygon points="160,230 106,230 132,278" />
  </g>
</svg>`;

let cachedLogoDataUrl: string | null = null;

export async function getSenaLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([SENA_SVG], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // High resolution for crisp PDF vector-like appearance
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 700;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 640, 700);
          ctx.drawImage(img, 0, 0, 640, 700);
          const dataUrl = canvas.toDataURL('image/png');
          cachedLogoDataUrl = dataUrl;
          URL.revokeObjectURL(url);
          resolve(dataUrl);
          return;
        }
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    } catch {
      resolve('');
    }
  });
}

