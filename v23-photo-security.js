/** EFGC Youth v28 — private member-photo rules mirrored in the UI. */
window.EFGCPhotoSecurity = {
  bucket: 'member-photos',
  maxBytes: 5242880,
  allowed: ['image/jpeg', 'image/png', 'image/webp'],
  private: true,
  validate(file) {
    if (!file) throw new Error('Choose a photo first.');
    if (!this.allowed.includes(file.type)) throw new Error('Use JPG, PNG or WebP.');
    if (file.size > this.maxBytes) throw new Error('Photo must be 5 MB or smaller.');
    return true;
  },
  async upload(file) {
    this.validate(file);
    if (!window.EFGCLive?.uploadOwnPhoto) throw new Error('Secure photo service is unavailable.');
    return window.EFGCLive.uploadOwnPhoto(file);
  },
};
