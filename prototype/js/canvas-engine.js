/**
 * NEXA Interactive Mobile Canvas Engine
 * Simulates mobile touch panning, sticky notes manipulation, and live cursors
 */

class WhiteboardCanvas {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.viewport = this.container.querySelector('.canvas-viewport');
    this.panX = -120;
    this.panY = -80;
    this.scale = 1.0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.activeNote = null;
    this.isDraggingNote = false;

    this.init();
  }

  init() {
    this.updateTransform();
    this.bindEvents();
    this.startSimulatedCollaborators();
  }

  updateTransform() {
    if (this.viewport) {
      this.viewport.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.scale})`;
    }
  }

  bindEvents() {
    // Mouse / Touch Pan
    const onStart = (e) => {
      // If clicked on sticky note, don't pan canvas
      const targetNote = e.target.closest('.sticky-note-card');
      if (targetNote) {
        this.selectNote(targetNote);
        this.isDraggingNote = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this.noteStartX = clientX;
        this.noteStartY = clientY;
        this.noteInitialLeft = parseInt(targetNote.style.left || 0);
        this.noteInitialTop = parseInt(targetNote.style.top || 0);
        return;
      }

      this.isPanning = true;
      this.startX = (e.touches ? e.touches[0].clientX : e.clientX) - this.panX;
      this.startY = (e.touches ? e.touches[0].clientY : e.clientY) - this.panY;
    };

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (this.isDraggingNote && this.activeNote) {
        const dx = (clientX - this.noteStartX) / this.scale;
        const dy = (clientY - this.noteStartY) / this.scale;
        this.activeNote.style.left = `${this.noteInitialLeft + dx}px`;
        this.activeNote.style.top = `${this.noteInitialTop + dy}px`;
        return;
      }

      if (!this.isPanning) return;
      this.panX = clientX - this.startX;
      this.panY = clientY - this.startY;
      this.updateTransform();
    };

    const onEnd = () => {
      this.isPanning = false;
      this.isDraggingNote = false;
    };

    this.container.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.container.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }

  selectNote(noteEl) {
    if (this.activeNote) this.activeNote.classList.remove('selected');
    this.activeNote = noteEl;
    this.activeNote.classList.add('selected');
  }

  addNewSticky(colorClass = 'sticky-note-yellow', text = 'New Idea...') {
    const note = document.createElement('div');
    note.className = `sticky-note sticky-note-card ${colorClass}`;
    note.style.position = 'absolute';
    // place near center of current pan
    const centerX = -this.panX + 140;
    const centerY = -this.panY + 200;
    note.style.left = `${centerX}px`;
    note.style.top = `${centerY}px`;
    note.style.width = '140px';
    note.style.minHeight = '120px';
    note.innerHTML = `
      <div class="note-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:10px; font-weight:600; opacity:0.6;">JUST NOW</span>
        <span style="font-size:12px; cursor:pointer;" onclick="this.closest('.sticky-note-card').remove()">✕</span>
      </div>
      <div contenteditable="true" style="outline:none; font-size:13px; font-weight:500;">${text}</div>
    `;
    this.viewport.appendChild(note);
    this.selectNote(note);
    if (typeof showToast === 'function') {
      showToast('Sticky note added to canvas');
    }
  }

  zoomIn() {
    this.scale = Math.min(2.0, this.scale + 0.15);
    this.updateTransform();
  }

  zoomOut() {
    this.scale = Math.max(0.5, this.scale - 0.15);
    this.updateTransform();
  }

  resetZoom() {
    this.scale = 1.0;
    this.panX = -80;
    this.panY = -60;
    this.updateTransform();
  }

  startSimulatedCollaborators() {
    const alex = document.getElementById('cursor-alex');
    const sarah = document.getElementById('cursor-sarah');

    if (!alex || !sarah) return;

    let t = 0;
    setInterval(() => {
      t += 0.05;
      const alexX = 260 + Math.sin(t * 1.5) * 60;
      const alexY = 220 + Math.cos(t * 2) * 40;
      alex.style.transform = `translate(${alexX}px, ${alexY}px)`;

      const sarahX = 420 + Math.cos(t) * 80;
      const sarahY = 340 + Math.sin(t * 1.2) * 50;
      sarah.style.transform = `translate(${sarahX}px, ${sarahY}px)`;
    }, 100);
  }
}
