const html = document.documentElement;
const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d");

const frameCount = 240;
const currentFrame = index => (
  `./video_frames/frame_${index.toString().padStart(6, '0')}.jpg`
)

const images = [];
let imagesLoaded = 0;

const preloadImages = () => {
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = currentFrame(i);
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 1) {
            // Setup canvas with the first image's dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
        }
    }
    images.push(img);
  }
};

const updateImage = index => {
    // index is 1-based, array is 0-based
    const img = images[index - 1];
    if (img && img.complete) {
        context.drawImage(img, 0, 0);
    }
};

window.addEventListener('scroll', () => {  
  const scrollTop = html.scrollTop;
  const maxScrollTop = html.scrollHeight - window.innerHeight;
  const scrollFraction = scrollTop / maxScrollTop;
  
  // Calculate which frame to show
  const frameIndex = Math.min(
    frameCount - 1,
    Math.floor(scrollFraction * frameCount)
  );
  
  requestAnimationFrame(() => updateImage(frameIndex + 1));
});

preloadImages();
