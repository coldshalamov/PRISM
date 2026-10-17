(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const overview = document.querySelector('#overview');
  const position = document.querySelector('#position');
  const mobile = matchMedia('(max-width: 900px)');
  const hashIndex = () => Math.max(0, slides.findIndex(slide => `#${slide.id}` === location.hash));
  let index = hashIndex();
  const paint = () => {
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  };
  const show = target => {
    index = Math.max(0, Math.min(slides.length - 1, target));
    history.replaceState(null, '', `#${slides[index].id}`);
    paint();
    if (document.body.classList.contains('overview') || mobile.matches) slides[index].scrollIntoView({block: 'start'});
  };
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  overview.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('overview');
    overview.setAttribute('aria-pressed', String(enabled));
    overview.textContent = enabled ? 'Slide view' : 'Overview';
    if (enabled) slides[index].scrollIntoView({block: 'start'});
    else window.scrollTo(0, 0);
  });
  window.addEventListener('hashchange', () => { index = hashIndex(); paint(); });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(document.activeElement.tagName)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); show(index + 1); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); show(index - 1); }
    if (event.key === 'Home') { event.preventDefault(); show(0); }
    if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
  });
  paint();
})();
