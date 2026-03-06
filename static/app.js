const form = document.getElementById('post-form');
const topicInput = document.getElementById('topic');
const imageFileInput = document.getElementById('image_file');
const imageModelSelect = document.getElementById('image-model');
const openImageSettingsButton = document.getElementById('open-image-settings');
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
const imageSettingsModal = document.getElementById('image-settings-modal');
const aspectRatioSelect = document.getElementById('setting-aspect-ratio');
const imageCountSelect = document.getElementById('setting-image-count');
const artStyleSelect = document.getElementById('setting-art-style');
const artStyleOptions = Array.from(document.querySelectorAll('.art-style-option'));
const customStyleWrap = document.getElementById('custom-style-wrap');
const customStyleInput = document.getElementById('setting-custom-style');
const customPromptInput = document.getElementById('setting-custom-prompt');
const closeImageSettingsButton = document.getElementById('close-image-settings');
const saveImageSettingsButton = document.getElementById('save-image-settings');
const contextMenu = document.getElementById('context-menu');
const ctxCut = document.getElementById('ctx-cut');
const ctxCopy = document.getElementById('ctx-copy');
const ctxPaste = document.getElementById('ctx-paste');
const ctxRegenerate = document.getElementById('ctx-regenerate');
const ctxReload = document.getElementById('ctx-reload');
const ctxClear = document.getElementById('ctx-clear');
const ctxCopyCaption = document.getElementById('ctx-copy-caption');
const ctxCopyImage = document.getElementById('ctx-copy-image');
const ctxDownloadImage = document.getElementById('ctx-download-image');

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
let allowTextOnlyPost = false;
let copyFeedbackTimeout = null;
let contextMenuTarget = null;
let contextMenuImageEl = null;
const imageGenerationSettings = {
  aspect_ratio: '1:1',
  image_count: 1,
  art_style: 'Illustration',
  custom_art_style: '',
  custom_prompt: '',
};
const IMAGE_NAME_PATTERN = /\.(png|jpe?g|gif|webp|bmp|heic|heif|avif)$/i;
const MAX_UPLOAD_EDGE = 1600;
const JPEG_QUALITY = 0.82;

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
  if (isLoading) {
    status.textContent = 'kAvI is writing...';
    status.className = '';
    return;
  }
  if (status.textContent === 'kAvI is writing...' && !status.className) {
    clearStatus();
  }
};

const setError = (message) => {
  status.textContent = message;
  status.className = 'status-error';
};

const clearStatus = () => {
  status.textContent = '';
  status.className = '';
};

const setPostEmptyMessage = (message) => {
  postEmpty.textContent = message;
};

const updateImageModelAvailability = () => {
  if (!imageModelSelect) return;
  const hasUserImageInput = selectedImages.length > 0;
  imageModelSelect.disabled = hasUserImageInput;
  if (openImageSettingsButton) {
    const shouldShowAdvanced = imageModelSelect.value !== 'none';
    openImageSettingsButton.classList.toggle('hidden', !shouldShowAdvanced);
    openImageSettingsButton.disabled = hasUserImageInput;
  }
};

const openImageSettingsModal = () => {
  if (!imageSettingsModal) return;
  aspectRatioSelect.value = imageGenerationSettings.aspect_ratio;
  imageCountSelect.value = String(imageGenerationSettings.image_count);
  const useCustomStyle = (imageGenerationSettings.custom_art_style || '').trim().length > 0;
  setArtStyleSelection(useCustomStyle ? 'Custom' : (imageGenerationSettings.art_style || artStyleSelect.value || 'Illustration'));
  if (customStyleInput) {
    customStyleInput.value = imageGenerationSettings.custom_art_style || '';
  }
  customPromptInput.value = imageGenerationSettings.custom_prompt;
  imageSettingsModal.classList.remove('hidden');
};

const closeImageSettingsModal = () => {
  if (!imageSettingsModal) return;
  imageSettingsModal.classList.add('hidden');
};

const setArtStyleSelection = (style) => {
  const selectedStyle = (style || 'Illustration').trim();
  artStyleSelect.value = selectedStyle;
  const isCustom = selectedStyle === 'Custom';
  customStyleWrap?.classList.toggle('hidden', !isCustom);
  artStyleOptions.forEach((option) => {
    const isActive = option.dataset.style === selectedStyle;
    option.classList.toggle('active', isActive);
    option.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
};

const loadArtStyleThumbnails = async () => {
  try {
    const response = await fetch('/image-style-thumbnails');
    const data = await response.json();
    const thumbnails = data?.thumbnails || {};
    artStyleOptions.forEach((option) => {
      const style = option.dataset.style;
      const thumb = option.querySelector('.art-style-thumb');
      const thumbUrl = thumbnails[style];
      if (thumb && thumbUrl) {
        thumb.style.backgroundImage = `url(${thumbUrl})`;
        thumb.classList.add('thumb-loaded');
      }
    });
  } catch {
    // Keep fallback gradients if thumbnail generation endpoint is unavailable.
  }
};

const flashStatus = (message, durationMs = 1800) => {
  status.textContent = message;
  status.className = 'status-copy-flash';
  window.setTimeout(() => {
    if (status.className === 'status-copy-flash' && status.textContent === message) {
      clearStatus();
    }
  }, durationMs);
};

const isTextInputElement = (target) => {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
};

const canPasteIntoTarget = (target) => {
  if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
  if (target instanceof HTMLInputElement) {
    const type = (target.type || 'text').toLowerCase();
    const textLike = ['text', 'search', 'url', 'tel', 'password', 'email', 'number'];
    return textLike.includes(type) && !target.disabled && !target.readOnly;
  }
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return false;
};

const hasTextSelection = () => {
  const selection = window.getSelection();
  return !!selection && selection.toString().trim().length > 0;
};

const hideContextMenu = () => {
  contextMenu?.classList.add('hidden');
  contextMenuTarget = null;
  contextMenuImageEl = null;
};

const updateContextMenuState = () => {
  const editable = canPasteIntoTarget(contextMenuTarget);
  const selectedText = hasTextSelection();
  const inputSelection = isTextInputElement(contextMenuTarget)
    ? contextMenuTarget.selectionStart !== contextMenuTarget.selectionEnd
    : false;
  const canCutCopyFromInput = isTextInputElement(contextMenuTarget) && inputSelection;

  ctxCut.disabled = !canCutCopyFromInput;
  ctxCopy.disabled = !(selectedText || canCutCopyFromInput || latestCaption.trim());
  ctxPaste.disabled = !editable;
  ctxRegenerate.disabled = button.disabled;
  ctxReload.disabled = false;
  ctxClear.disabled = !hasGenerated && !latestCaption.trim();
  ctxCopyCaption.disabled = !latestCaption.trim();
  ctxCopyImage.disabled = !contextMenuImageEl || !contextMenuImageEl.src;
  ctxDownloadImage.disabled = !contextMenuImageEl || !contextMenuImageEl.src;
};

const showContextMenu = (x, y) => {
  if (!contextMenu) return;
  contextMenu.classList.remove('hidden');
  const rect = contextMenu.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - 8;
  const maxTop = window.innerHeight - rect.height - 8;
  contextMenu.style.left = `${Math.max(8, Math.min(x, maxLeft))}px`;
  contextMenu.style.top = `${Math.max(8, Math.min(y, maxTop))}px`;
};

const updatePostVisibility = () => {
  const hasRenderablePost = hasGenerated && (postImages.length > 0 || allowTextOnlyPost);
  instaPost.classList.toggle('pre-generate', !hasRenderablePost);
  postEmpty.classList.toggle('hidden', hasRenderablePost);
  instaHeader.classList.toggle('hidden', !hasRenderablePost);
  postLayout.classList.toggle('hidden', !hasRenderablePost);
  copyButton.disabled = !hasRenderablePost || latestCaption.trim().length === 0;
};

const preventDefaultDropBehavior = (event) => {
  event.preventDefault();
};

const isInsideDropZone = (target) => {
  return target instanceof Node && dropZone.contains(target);
};

const extractDroppedFiles = (event) => {
  const dt = event.dataTransfer;
  if (!dt) return [];
  const itemFiles = Array.from(dt.items || [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (itemFiles.length > 0) return itemFiles;
  return Array.from(dt.files || []);
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

const isLikelyImageFile = (file) => {
  const mime = (file.type || '').toLowerCase();
  const name = file.name || '';
  return mime.startsWith('image/') || IMAGE_NAME_PATTERN.test(name);
};

const readAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
};

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image.'));
    img.src = src;
  });
};

const optimizeImageDataUrl = async (file) => {
  const original = await readAsDataUrl(file);
  const mime = (file.type || '').toLowerCase();

  // Keep GIF original to avoid flattening animation frames.
  if (mime === 'image/gif') {
    return { dataUrl: original, mimeType: 'image/gif' };
  }

  const img = await loadImage(original);
  const maxEdge = Math.max(img.width, img.height);
  if (maxEdge <= MAX_UPLOAD_EDGE) {
    const fallbackMime = mime.startsWith('image/') ? mime : 'image/jpeg';
    return { dataUrl: original, mimeType: fallbackMime };
  }

  const scale = MAX_UPLOAD_EDGE / maxEdge;
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    const fallbackMime = mime.startsWith('image/') ? mime : 'image/jpeg';
    return { dataUrl: original, mimeType: fallbackMime };
  }

  context.drawImage(img, 0, 0, targetWidth, targetHeight);
  const outputMime = (mime === 'image/png' || mime === 'image/webp') ? mime : 'image/jpeg';
  const resized = canvas.toDataURL(outputMime, JPEG_QUALITY);
  return { dataUrl: resized, mimeType: outputMime };
};

const fileToSelectedImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!isLikelyImageFile(file)) {
      reject(new Error('Only image files are supported.'));
      return;
    }

    optimizeImageDataUrl(file)
      .then(({ dataUrl, mimeType }) => {
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        if (!base64) {
          reject(new Error('Invalid image encoding.'));
          return;
        }
        resolve({
          base64,
          mimeType,
          name: file.name || 'Pasted image',
          previewUrl: URL.createObjectURL(file),
          source: 'user',
        });
      })
      .catch((error) => {
        reject(error instanceof Error ? error : new Error('Failed to process image.'));
      });
  });
};

const setSelectedImages = async (files) => {
  if (files.length === 0) {
    return;
  }

  const imageFiles = files.filter((file) => isLikelyImageFile(file));
  if (imageFiles.length === 0) {
    throw new Error('Drop image files only.');
  }

  const resolved = await Promise.all(imageFiles.map((file) => fileToSelectedImage(file)));
  const previousLength = selectedImages.length;
  selectedImages = [...selectedImages, ...resolved];
  selectedImageIndex = previousLength;
  updateImageModelAvailability();
  renderCarousel();
};

const handleIncomingFiles = async (files) => {
  if (!files || files.length === 0) {
    setError('Drop image files only.');
    return;
  }
  try {
    await setSelectedImages(files);
    clearStatus();
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Invalid image.');
  }
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
  allowTextOnlyPost = false;
  setPostEmptyMessage('Generate a post to preview it here.');
  clearStatus();
  updatePostVisibility();
  renderCarousel();
};

const generatePost = async () => {
  output.innerHTML = '';
  clearStatus();

  const topic = topicInput.value.trim();
  const tone = toneSelect.value;
  const selectedImageModel = imageModelSelect?.value || 'flux';
  const reusablePostImages = postImages.filter((img) => img.source === 'user');
  const requestImages = selectedImages.length > 0 ? selectedImages : reusablePostImages;
  const hasImageInput = requestImages.length > 0 || selectedImageModel !== 'none';
  const isNoImageAndModelNone = requestImages.length === 0 && selectedImageModel === 'none';
  const shouldGenerateFluxImage = requestImages.length === 0 && selectedImageModel === 'flux';
  let imageGenerationFailureMessage = '';

  if (!topic && !hasImageInput) {
    setError('Add a topic or image first.');
    return;
  }

  try {
    postImages = [...requestImages];
    postImageIndex = 0;
    hasGenerated = true;
    allowTextOnlyPost = false;
    setPostEmptyMessage('Generating post image...');
    updatePostVisibility();
    renderCarousel();
    setLoading(true);

    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        tone,
        include_generated_image: shouldGenerateFluxImage,
        image_settings: imageGenerationSettings,
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

    if (shouldGenerateFluxImage) {
      const generatedItems = Array.isArray(data.generated_images) ? data.generated_images : [];
      if (generatedItems.length > 0) {
        postImages = generatedItems
          .filter((item) => item?.base64)
          .map((item, index) => {
            const mimeType = (item.mime_type || 'image/png').trim() || 'image/png';
            const base64 = item.base64;
            return {
              base64,
              mimeType,
              name: `Generated image ${index + 1}`,
              previewUrl: `data:${mimeType};base64,${base64}`,
              source: 'flux',
            };
          });
        postImageIndex = 0;
        allowTextOnlyPost = false;
        setPostEmptyMessage('Generate a post to preview it here.');
      } else {
        const generatedBase64 = (data.generated_image_base64 || '').trim();
        const generatedMimeType = (data.generated_image_mime_type || 'image/png').trim() || 'image/png';
        if (generatedBase64) {
          postImages = [{
            base64: generatedBase64,
            mimeType: generatedMimeType,
            name: 'Generated image',
            previewUrl: `data:${generatedMimeType};base64,${generatedBase64}`,
            source: 'flux',
          }];
          postImageIndex = 0;
          allowTextOnlyPost = false;
          setPostEmptyMessage('Generate a post to preview it here.');
        } else {
          postImages = [];
          postImageIndex = 0;
          allowTextOnlyPost = true;
          imageGenerationFailureMessage = 'Post image generation failed. No image post available.';
          setPostEmptyMessage('Post image generation failed. Try again.');
        }
      }
      if (data.image_generation_error) {
        postImages = [];
        postImageIndex = 0;
        allowTextOnlyPost = true;
        imageGenerationFailureMessage = `Post image generation failed: ${data.image_generation_error}`;
        setPostEmptyMessage('Post image generation failed. Try again.');
      }
    } else if (isNoImageAndModelNone) {
      // Text-only mode is allowed when no image is provided and model is None.
      postImages = [];
      postImageIndex = 0;
      allowTextOnlyPost = true;
      setPostEmptyMessage('Generate a post to preview it here.');
    } else {
      allowTextOnlyPost = false;
    }

    renderPoem(data.poetic_response || '');
    updatePostVisibility();
    renderCarousel();

    if (selectedImages.length > 0) {
      selectedImages = [];
      selectedImageIndex = 0;
      imageFileInput.value = '';
      updateImageModelAvailability();
      leftImagePreview.classList.add('hidden');
      imageName.textContent = '';
      leftPreviewDots.innerHTML = '';
      leftImageCounter.textContent = '0 / 0';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setError(`Failed: ${message}`);
  } finally {
    updateImageModelAvailability();
    setLoading(false);
    if (imageGenerationFailureMessage && latestCaption.trim()) {
      flashStatus(imageGenerationFailureMessage);
    }
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

window.addEventListener('dragover', (event) => {
  // Enable dropping files anywhere in app (especially useful on tight layouts).
  if (event.dataTransfer?.types?.includes('Files')) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }
});

window.addEventListener('drop', async (event) => {
  if (event.dataTransfer?.types?.includes('Files')) {
    event.preventDefault();
    const files = extractDroppedFiles(event);
    // Drop on zone is handled there; elsewhere is handled globally.
    if (!isInsideDropZone(event.target)) {
      await handleIncomingFiles(files);
    }
  }
});

imageFileInput.addEventListener('change', async () => {
  const files = Array.from(imageFileInput.files ?? []);
  imageFileInput.value = '';
  if (files.length === 0) return;
  await handleIncomingFiles(files);
});

dropZone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
  dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone-active');
});

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.remove('drop-zone-active');
  const files = extractDroppedFiles(event);
  await handleIncomingFiles(files);
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
  await handleIncomingFiles(files);
});

imageModelSelect?.addEventListener('change', () => {
  updateImageModelAvailability();
});

openImageSettingsButton?.addEventListener('click', () => {
  if (imageModelSelect.value === 'none') return;
  openImageSettingsModal();
});

closeImageSettingsButton?.addEventListener('click', () => {
  closeImageSettingsModal();
});

saveImageSettingsButton?.addEventListener('click', () => {
  imageGenerationSettings.aspect_ratio = aspectRatioSelect.value || '1:1';
  imageGenerationSettings.image_count = Number.parseInt(imageCountSelect.value || '1', 10) || 1;
  imageGenerationSettings.custom_art_style = (customStyleInput?.value || '').trim();
  if ((artStyleSelect.value || 'Illustration') === 'Custom') {
    imageGenerationSettings.art_style = imageGenerationSettings.custom_art_style || 'Custom';
  } else {
    imageGenerationSettings.art_style = artStyleSelect.value || 'Illustration';
  }
  imageGenerationSettings.custom_prompt = (customPromptInput.value || '').trim();
  closeImageSettingsModal();
});

imageSettingsModal?.addEventListener('click', (event) => {
  if (event.target === imageSettingsModal) {
    closeImageSettingsModal();
  }
});

artStyleOptions.forEach((option) => {
  option.addEventListener('click', () => {
    setArtStyleSelection(option.dataset.style || 'Illustration');
  });
});

document.addEventListener('contextmenu', (event) => {
  if (imageSettingsModal && !imageSettingsModal.classList.contains('hidden')) return;
  event.preventDefault();
  contextMenuTarget = event.target;
  contextMenuImageEl = event.target instanceof HTMLImageElement ? event.target : null;
  updateContextMenuState();
  showContextMenu(event.clientX, event.clientY);
});

document.addEventListener('click', () => {
  hideContextMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideContextMenu();
  }
});

ctxCut?.addEventListener('click', async () => {
  if (!isTextInputElement(contextMenuTarget)) return;
  const start = contextMenuTarget.selectionStart ?? 0;
  const end = contextMenuTarget.selectionEnd ?? 0;
  if (start === end) return;
  const selected = contextMenuTarget.value.slice(start, end);
  try {
    await navigator.clipboard.writeText(selected);
    contextMenuTarget.setRangeText('', start, end, 'start');
  } catch {
    setError('Failed to cut text.');
  } finally {
    hideContextMenu();
  }
});

ctxCopy?.addEventListener('click', async () => {
  try {
    if (isTextInputElement(contextMenuTarget)) {
      const start = contextMenuTarget.selectionStart ?? 0;
      const end = contextMenuTarget.selectionEnd ?? 0;
      if (start !== end) {
        await navigator.clipboard.writeText(contextMenuTarget.value.slice(start, end));
        hideContextMenu();
        return;
      }
    }
    const selectionText = window.getSelection()?.toString().trim();
    if (selectionText) {
      await navigator.clipboard.writeText(selectionText);
      hideContextMenu();
      return;
    }
    if (latestCaption.trim()) {
      await navigator.clipboard.writeText(latestCaption);
      hideContextMenu();
      return;
    }
  } catch {
    setError('Failed to copy text.');
  } finally {
    hideContextMenu();
  }
});

ctxPaste?.addEventListener('click', async () => {
  if (!canPasteIntoTarget(contextMenuTarget)) return;
  try {
    const text = await navigator.clipboard.readText();
    if (contextMenuTarget instanceof HTMLInputElement || contextMenuTarget instanceof HTMLTextAreaElement) {
      const start = contextMenuTarget.selectionStart ?? contextMenuTarget.value.length;
      const end = contextMenuTarget.selectionEnd ?? contextMenuTarget.value.length;
      contextMenuTarget.setRangeText(text, start, end, 'end');
      contextMenuTarget.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (contextMenuTarget instanceof HTMLElement && contextMenuTarget.isContentEditable) {
      document.execCommand('insertText', false, text);
    }
  } catch {
    setError('Failed to paste text.');
  } finally {
    hideContextMenu();
  }
});

ctxRegenerate?.addEventListener('click', () => {
  hideContextMenu();
  if (!button.disabled) form.requestSubmit();
});

ctxReload?.addEventListener('click', () => {
  hideContextMenu();
  window.location.reload();
});

ctxClear?.addEventListener('click', () => {
  hideContextMenu();
  clearGeneratedOutput();
});

ctxCopyCaption?.addEventListener('click', async () => {
  if (!latestCaption.trim()) return;
  try {
    await navigator.clipboard.writeText(latestCaption);
    flashStatus('Caption copied.');
  } catch {
    setError('Failed to copy caption.');
  } finally {
    hideContextMenu();
  }
});

ctxCopyImage?.addEventListener('click', async () => {
  if (!contextMenuImageEl?.src) return;
  try {
    const response = await fetch(contextMenuImageEl.src);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || 'image/png']: blob }),
    ]);
    flashStatus('Image copied.');
  } catch {
    setError('Failed to copy image.');
  } finally {
    hideContextMenu();
  }
});

ctxDownloadImage?.addEventListener('click', async () => {
  if (!contextMenuImageEl?.src) return;
  try {
    const a = document.createElement('a');
    a.href = contextMenuImageEl.src;
    a.download = `kavi-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    hideContextMenu();
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
setArtStyleSelection(imageGenerationSettings.art_style);
loadArtStyleThumbnails();
updateImageModelAvailability();
updatePostVisibility();
renderCarousel();
