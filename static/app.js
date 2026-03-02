const form = document.getElementById('post-form');
const topicInput = document.getElementById('topic');
const imageFileInput = document.getElementById('image_file');
const dropZone = document.getElementById('drop-zone');
const imageName = document.getElementById('image-name');
const toneSelect = document.getElementById('tone');
const output = document.getElementById('output');
const status = document.getElementById('status');
const button = document.getElementById('generate-btn');
const copyButton = document.getElementById('copy-caption');
const instaHeader = document.getElementById('insta-header');
const postLayout = document.getElementById('post-layout');
const instaPost = document.getElementById('insta-post');
const postEmpty = document.getElementById('post-empty');

const leftImagePreview = document.getElementById('left-image-preview');
const leftPreviewImage = document.getElementById('left-preview-image');
const leftPreviewDots = document.getElementById('left-preview-dots');
const leftImageCounter = document.getElementById('left-image-counter');
const leftPrevImageButton = document.getElementById('left-prev-image');
const leftNextImageButton = document.getElementById('left-next-image');

const imagePreview = document.getElementById('image-preview');
const previewImage = document.getElementById('preview-image');
const previewDots = document.getElementById('preview-dots');
const imageCounter = document.getElementById('image-counter');
const prevImageButton = document.getElementById('prev-image');
const nextImageButton = document.getElementById('next-image');

let selectedImages = [];
let postImages = [];
let selectedImageIndex = 0;
let postImageIndex = 0;
let hasGenerated = false;
let latestCaption = '';
let copyFeedbackTimeout = null;

const COPY_ICON_SVG = `
<svg width="20" height="20" viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M7.5 3H14.6C16.8402 3 17.9603 3 18.816 3.43597C19.5686 3.81947 20.1805 4.43139 20.564 5.18404C21 6.03969 21 7.15979 21 9.4V16.5M6.2 21H14.3C15.4201 21 15.9802 21 16.408 20.782C16.7843 20.5903 17.0903 20.2843 17.282 19.908C17.5 19.4802 17.5 18.9201 17.5 17.8V9.7C17.5 8.57989 17.5 8.01984 17.282 7.59202C17.0903 7.21569 16.7843 6.90973 16.408 6.71799C15.9802 6.5 15.4201 6.5 14.3 6.5H6.2C5.0799 6.5 4.51984 6.5 4.09202 6.71799C3.71569 6.90973 3.40973 7.21569 3.21799 7.59202C3 8.01984 3 8.57989 3 9.7V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21Z" stroke="currentColor" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
`.trim();

const COPIED_ICON_SVG = `
<svg width="20" height="20" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M5.5 12.5L10.167 17L19.5 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
`.trim();

const setLoading = (isLoading) => {
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Writing...' : 'Generate';
  status.textContent = isLoading ? 'kAvI is writing...' : '';
};

const setError = (message) => {
  status.textContent = message;
  status.className = 'status-error';
};

const clearStatus = () => {
  status.textContent = '';
  status.className = '';
};

const updatePostVisibility = () => {
  const preGenerate = !hasGenerated;
  instaPost.classList.toggle('pre-generate', preGenerate);
  postEmpty.classList.toggle('hidden', !preGenerate);
  instaHeader.classList.toggle('hidden', preGenerate);
  postLayout.classList.toggle('hidden', preGenerate);
  copyButton.disabled = preGenerate || latestCaption.trim().length === 0;
};

const preventDefaultDropBehavior = (event) => {
  event.preventDefault();
};

const revokeImageUrls = () => {
  selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
};

const renderDots = (container, count, activeIndex) => {
  container.innerHTML = '';
  for (let index = 0; index < count; index += 1) {
    const dot = document.createElement('span');
    dot.className = `preview-dot ${index === activeIndex ? 'preview-dot-active' : ''}`;
    container.appendChild(dot);
  }
};

const renderCarousel = () => {
  leftImagePreview.classList.toggle('hidden', selectedImages.length === 0);
  imageName.textContent = selectedImages.length === 0
    ? ''
    : `${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} loaded`;

  const showRightMedia = hasGenerated && postImages.length > 0;
  imagePreview.classList.toggle('hidden', !showRightMedia);
  postLayout.classList.toggle('no-media', !showRightMedia);
  instaPost.classList.toggle('no-media', !showRightMedia);

  if (selectedImages.length > 0) {
    selectedImageIndex = Math.min(selectedImageIndex, selectedImages.length - 1);
    const leftCurrent = selectedImages[selectedImageIndex];
    leftPreviewImage.src = leftCurrent.previewUrl;
    leftImageCounter.textContent = `${selectedImageIndex + 1} / ${selectedImages.length}`;
    renderDots(leftPreviewDots, selectedImages.length, selectedImageIndex);
  } else {
    leftPreviewDots.innerHTML = '';
    leftImageCounter.textContent = '0 / 0';
  }

  if (postImages.length === 0) {
    previewImage.removeAttribute('src');
    previewDots.innerHTML = '';
    imageCounter.textContent = '0 / 0';
    prevImageButton.classList.add('hidden');
    nextImageButton.classList.add('hidden');
    leftPrevImageButton.classList.toggle('hidden', selectedImages.length < 2);
    leftNextImageButton.classList.toggle('hidden', selectedImages.length < 2);
    return;
  }

  postImageIndex = Math.min(postImageIndex, postImages.length - 1);
  const current = postImages[postImageIndex];
  if (showRightMedia) {
    previewImage.src = current.previewUrl;
  }

  imageCounter.textContent = `${postImageIndex + 1} / ${postImages.length}`;
  renderDots(previewDots, postImages.length, postImageIndex);

  const showNav = postImages.length > 1;
  prevImageButton.classList.toggle('hidden', !showNav);
  nextImageButton.classList.toggle('hidden', !showNav);
  leftPrevImageButton.classList.toggle('hidden', selectedImages.length < 2);
  leftNextImageButton.classList.toggle('hidden', selectedImages.length < 2);
};

const fileFromClipboard = (event) => {
  const files = [];
  const items = event.clipboardData?.items ?? [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }
  return files;
};

const fileToSelectedImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are supported.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : '';
      if (!base64) {
        reject(new Error('Invalid image encoding.'));
        return;
      }
      resolve({
        base64,
        mimeType: file.type || 'image/png',
        name: file.name || 'Pasted image',
        previewUrl: URL.createObjectURL(file),
      });
    };
    reader.readAsDataURL(file);
  });
};

const setSelectedImages = async (files) => {
  if (files.length === 0) {
    return;
  }

  const resolved = await Promise.all(files.map((file) => fileToSelectedImage(file)));
  const previousLength = selectedImages.length;
  selectedImages = [...selectedImages, ...resolved];
  selectedImageIndex = previousLength;
  renderCarousel();
};

const renderPoem = (text) => {
  output.innerHTML = '';
  const poem = document.createElement('p');
  poem.className = 'poem';
  poem.textContent = text;
  output.appendChild(poem);
  latestCaption = text;
  copyButton.disabled = text.trim().length === 0;
};

const gotoPreviousPost = () => {
  if (postImages.length < 2) return;
  postImageIndex = (postImageIndex - 1 + postImages.length) % postImages.length;
  renderCarousel();
};

const gotoNextPost = () => {
  if (postImages.length < 2) return;
  postImageIndex = (postImageIndex + 1) % postImages.length;
  renderCarousel();
};

const gotoPreviousSelected = () => {
  if (selectedImages.length < 2) return;
  selectedImageIndex = (selectedImageIndex - 1 + selectedImages.length) % selectedImages.length;
  renderCarousel();
};

const gotoNextSelected = () => {
  if (selectedImages.length < 2) return;
  selectedImageIndex = (selectedImageIndex + 1) % selectedImages.length;
  renderCarousel();
};

const clearGeneratedOutput = () => {
  output.innerHTML = '';
  latestCaption = '';
  postImages = [];
  postImageIndex = 0;
  hasGenerated = false;
  clearStatus();
  updatePostVisibility();
  renderCarousel();
};

const generatePost = async () => {
  output.innerHTML = '';
  clearStatus();

  const topic = topicInput.value.trim();
  const tone = toneSelect.value;
  const requestImages = selectedImages.length > 0 ? selectedImages : postImages;

  if (!topic && requestImages.length === 0) {
    setError('Add a topic or image first.');
    return;
  }

  try {
    postImages = [...requestImages];
    postImageIndex = 0;
    hasGenerated = true;
    updatePostVisibility();
    renderCarousel();
    setLoading(true);

    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        tone,
        image_items: requestImages.map((img) => ({
          base64: img.base64,
          mime_type: img.mimeType,
          name: img.name,
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || 'Failed to generate caption.');
    }

    renderPoem(data.poetic_response || '');

    if (selectedImages.length > 0) {
      selectedImages = [];
      selectedImageIndex = 0;
      imageFileInput.value = '';
      leftImagePreview.classList.add('hidden');
      imageName.textContent = '';
      leftPreviewDots.innerHTML = '';
      leftImageCounter.textContent = '0 / 0';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setError(`Failed: ${message}`);
  } finally {
    setLoading(false);
  }
};

const setupToneDropdown = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'tone-select-custom';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'tone-select-trigger';

  const menu = document.createElement('div');
  menu.className = 'tone-select-menu hidden';

  const updateSelected = () => {
    const selectedOption = toneSelect.options[toneSelect.selectedIndex];
    trigger.textContent = selectedOption?.textContent || 'Select tone';
    const items = Array.from(menu.querySelectorAll('.tone-option'));
    items.forEach((item) => {
      item.classList.toggle('tone-option-active', item.dataset.value === toneSelect.value);
    });
  };

  const openMenu = () => {
    menu.classList.remove('hidden');
    trigger.classList.add('tone-open');
  };

  const closeMenu = () => {
    menu.classList.add('hidden');
    trigger.classList.remove('tone-open');
  };

  for (const child of Array.from(toneSelect.children)) {
    if (child instanceof HTMLOptGroupElement) {
      const groupLabel = document.createElement('p');
      groupLabel.className = 'tone-group-label';
      groupLabel.textContent = child.label;
      menu.appendChild(groupLabel);

      for (const option of Array.from(child.children)) {
        if (!(option instanceof HTMLOptionElement)) continue;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'tone-option';
        item.dataset.value = option.value;
        item.textContent = option.textContent || option.value;
        item.addEventListener('click', () => {
          toneSelect.value = option.value;
          updateSelected();
          closeMenu();
        });
        menu.appendChild(item);
      }
      continue;
    }

    if (child instanceof HTMLOptionElement) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'tone-option';
      item.dataset.value = child.value;
      item.textContent = child.textContent || child.value;
      item.addEventListener('click', () => {
        toneSelect.value = child.value;
        updateSelected();
        closeMenu();
      });
      menu.appendChild(item);
    }
  }

  trigger.addEventListener('click', () => {
    if (menu.classList.contains('hidden')) openMenu();
    else closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  toneSelect.classList.add('tone-native-hidden');
  toneSelect.insertAdjacentElement('afterend', wrapper);
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);
  updateSelected();
};

window.addEventListener('dragover', preventDefaultDropBehavior);
window.addEventListener('drop', preventDefaultDropBehavior);

imageFileInput.addEventListener('change', async () => {
  const files = Array.from(imageFileInput.files ?? []);
  imageFileInput.value = '';
  if (files.length === 0) return;
  try {
    await setSelectedImages(files);
    clearStatus();
  } catch (error) {
    revokeImageUrls();
    selectedImages = [];
    setError(error instanceof Error ? error.message : 'Invalid image.');
  }
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone-active');
});

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropZone.classList.remove('drop-zone-active');
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) return;
  try {
    await setSelectedImages(files);
    clearStatus();
  } catch (error) {
    revokeImageUrls();
    selectedImages = [];
    setError(error instanceof Error ? error.message : 'Invalid image.');
  }
});

dropZone.addEventListener('click', () => imageFileInput.click());

dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    imageFileInput.click();
  }
});

window.addEventListener('paste', async (event) => {
  const files = fileFromClipboard(event);
  if (files.length === 0) return;
  event.preventDefault();
  try {
    await setSelectedImages(files);
    clearStatus();
  } catch (error) {
    revokeImageUrls();
    selectedImages = [];
    setError(error instanceof Error ? error.message : 'Invalid image.');
  }
});

prevImageButton.addEventListener('click', gotoPreviousPost);
nextImageButton.addEventListener('click', gotoNextPost);
leftPrevImageButton.addEventListener('click', gotoPreviousSelected);
leftNextImageButton.addEventListener('click', gotoNextSelected);

copyButton.addEventListener('click', async () => {
  if (!latestCaption.trim()) return;
  try {
    await navigator.clipboard.writeText(latestCaption);
    if (copyFeedbackTimeout) clearTimeout(copyFeedbackTimeout);
    copyButton.innerHTML = COPIED_ICON_SVG;
    status.textContent = 'Caption copied.';
    status.className = 'status-copy-flash';
    copyFeedbackTimeout = setTimeout(() => {
      copyButton.innerHTML = COPY_ICON_SVG;
      status.textContent = '';
      status.className = '';
      copyFeedbackTimeout = null;
    }, 1400);
  } catch {
    setError('Failed to copy caption.');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  await generatePost();
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
    event.preventDefault();
    if (!button.disabled) form.requestSubmit();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    clearGeneratedOutput();
  }
});

setupToneDropdown();
updatePostVisibility();
renderCarousel();
