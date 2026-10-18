// The story behind the show on now, laid over the TV like a page torn from
// the listings magazine (INFO on the remote, or I). A modal dialog: focus
// moves into it and stays there, and Esc, I, the close button or a click
// outside puts it away, handing focus back where it was.

const FOCUSABLE = 'a[href], button, video[controls], [tabindex]:not([tabindex="-1"])';

export class StoryOverlay {
  constructor({ onClose = () => {} } = {}) {
    this.onClose = onClose;
    this.el = document.createElement('div');
    this.el.className = 'story-overlay';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="story-overlay__backdrop" data-close></div>
      <div class="story-overlay__sheet" role="dialog" aria-modal="true" tabindex="-1">
        <button type="button" class="story-overlay__close" data-close aria-label="Close the story">×</button>
        <div class="story-overlay__content"></div>
        <a class="story-overlay__page">Open this as a page</a>
      </div>`;
    this.sheet = this.el.querySelector('.story-overlay__sheet');
    this.content = this.el.querySelector('.story-overlay__content');
    this.pageLink = this.el.querySelector('.story-overlay__page');
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) this.close();
    });
    this.el.addEventListener('keydown', (e) => this.keep(e));
    document.body.append(this.el);
    this.slug = null;
  }

  get isOpen() {
    return !this.el.hidden;
  }

  // `html` is the rendered story; `page` the project's own page.
  open({ slug, html, page }) {
    this.returnTo = this.isOpen ? this.returnTo : document.activeElement;
    this.slug = slug;
    this.content.innerHTML = html;
    this.pageLink.href = page;
    const heading = this.content.querySelector('h1');
    if (heading?.id) this.sheet.setAttribute('aria-labelledby', heading.id);
    this.el.hidden = false;
    this.sheet.scrollTop = 0;
    this.sheet.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.el.hidden = true;
    this.content.querySelectorAll('video').forEach((v) => v.pause());
    this.slug = null;
    this.returnTo?.focus?.();
    this.onClose();
  }

  // Esc closes; Tab cycles through what's inside.
  keep(e) {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'i') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...this.sheet.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === this.sheet)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
