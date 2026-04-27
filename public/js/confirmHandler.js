(function () {
  var ACTIVE_CLASS = 'is-visible';
  var BODY_LOCK_CLASS = 'confirm-modal-open';
  var SKIP_ATTR = 'data-confirm-skip';
  var DEFAULT_TITLE = 'Подтвердите действие';
  var DEFAULT_DESCRIPTION = 'Это действие нельзя отменить.';
  var DEFAULT_CONFIRM_TEXT = 'Подтвердить';
  var DEFAULT_CANCEL_TEXT = 'Отмена';

  var state = {
    active: false,
    resolve: null,
    overlay: null,
    dialog: null,
    titleNode: null,
    descriptionNode: null,
    confirmButton: null,
    cancelButton: null,
    lastFocusedElement: null
  };

  function getOption(source, name, fallback) {
    if (!source) return fallback;

    if (source.dataset && source.dataset[name]) {
      return source.dataset[name];
    }

    return fallback;
  }

  function buildDescription(value) {
    return String(value || '').trim();
  }

  function ensureDialog() {
    if (state.overlay) return;

    state.overlay = document.createElement('div');
    state.overlay.className = 'confirm-modal-overlay';
    state.overlay.setAttribute('role', 'presentation');

    state.dialog = document.createElement('div');
    state.dialog.className = 'confirm-modal card border-0 shadow-lg';
    state.dialog.setAttribute('role', 'dialog');
    state.dialog.setAttribute('aria-modal', 'true');
    state.dialog.setAttribute('aria-labelledby', 'global-confirm-title');
    state.dialog.setAttribute('aria-describedby', 'global-confirm-description');

    var body = document.createElement('div');
    body.className = 'card-body p-4 p-md-5';

    state.titleNode = document.createElement('h2');
    state.titleNode.id = 'global-confirm-title';
    state.titleNode.className = 'h4 mb-3 confirm-modal__title';

    state.descriptionNode = document.createElement('p');
    state.descriptionNode.id = 'global-confirm-description';
    state.descriptionNode.className = 'mb-4 text-secondary confirm-modal__description';

    var actions = document.createElement('div');
    actions.className = 'd-flex gap-2 justify-content-end flex-wrap';

    state.cancelButton = document.createElement('button');
    state.cancelButton.type = 'button';
    state.cancelButton.className = 'btn btn-outline-secondary';
    state.cancelButton.textContent = DEFAULT_CANCEL_TEXT;

    state.confirmButton = document.createElement('button');
    state.confirmButton.type = 'button';
    state.confirmButton.className = 'btn btn-danger';
    state.confirmButton.textContent = DEFAULT_CONFIRM_TEXT;

    actions.appendChild(state.cancelButton);
    actions.appendChild(state.confirmButton);
    body.appendChild(state.titleNode);
    body.appendChild(state.descriptionNode);
    body.appendChild(actions);
    state.dialog.appendChild(body);
    state.overlay.appendChild(state.dialog);
    document.body.appendChild(state.overlay);

    state.overlay.addEventListener('click', function (event) {
      if (event.target === state.overlay) {
        settle(false);
      }
    });

    state.dialog.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    state.cancelButton.addEventListener('click', function () {
      settle(false);
    });

    state.confirmButton.addEventListener('click', function () {
      console.log('[confirm] click confirm');
      settle(true);
    });

    document.addEventListener('keydown', function (event) {
      if (!state.active) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        settle(true);
      }
    }, true);
  }

  function open(options) {
    ensureDialog();

    console.log('[confirm] open modal', options);
    state.active = true;
    state.lastFocusedElement = document.activeElement;

    var title = buildDescription(options.title) || DEFAULT_TITLE;
    var description = buildDescription(options.description) || DEFAULT_DESCRIPTION;
    var confirmText = buildDescription(options.confirmText) || DEFAULT_CONFIRM_TEXT;
    var cancelText = buildDescription(options.cancelText) || DEFAULT_CANCEL_TEXT;

    state.titleNode.textContent = title;
    state.descriptionNode.textContent = description;
    state.confirmButton.textContent = confirmText;
    state.cancelButton.textContent = cancelText;

    state.overlay.classList.add(ACTIVE_CLASS);
    document.body.classList.add(BODY_LOCK_CLASS);

    window.setTimeout(function () {
      state.confirmButton.focus();
    }, 0);
  }

  function settle(value) {
    if (!state.active || typeof state.resolve !== 'function') {
      if (state.overlay) {
        state.overlay.classList.remove(ACTIVE_CLASS);
      }
      document.body.classList.remove(BODY_LOCK_CLASS);
      return;
    }

    console.log('[confirm] resolve', value);
    var resolve = state.resolve;
    state.resolve = null;
    state.active = false;

    state.overlay.classList.remove(ACTIVE_CLASS);
    document.body.classList.remove(BODY_LOCK_CLASS);

    resolve(Boolean(value));

    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
      window.setTimeout(function () {
        try {
          state.lastFocusedElement.focus();
        } catch (err) {
          // ignore focus restoration failures
        }
      }, 0);
    }
  }

  function createConfirm(options) {
    var config = options || {};

    if (state.active) {
      settle(false);
    }

    return new Promise(function (resolve) {
      ensureDialog();

      state.resolve = resolve;
      open(config);
    });
  }

  function getConfirmOptions(source) {
    return {
      title: getOption(source, 'confirmTitle', getOption(source, 'confirmTextTitle', '')) || getOption(source, 'confirm', ''),
      description: getOption(source, 'confirmDescription', ''),
      confirmText: getOption(source, 'confirmButtonText', getOption(source, 'confirmText', '')),
      cancelText: getOption(source, 'cancelText', '')
    };
  }

  function resolveSubmitTarget(form, submitter) {
    if (submitter) return submitter;
    return form.querySelector('[data-confirm]') || form.querySelector('button[type="submit"], input[type="submit"]');
  }

  function submitConfirmedForm(form, submitter) {
    console.log('[confirm] enter delete/submit flow', form.action || form.getAttribute('action'));
    form.setAttribute(SKIP_ATTR, '1');

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit(submitter || undefined);
      return;
    }

    if (submitter && typeof submitter.click === 'function') {
      submitter.click();
      return;
    }

    form.submit();
  }

  function handleSubmit(event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.getAttribute(SKIP_ATTR) === '1') {
      form.removeAttribute(SKIP_ATTR);
      return;
    }

    var submitter = event.submitter || resolveSubmitTarget(form);
    if (!submitter) return;

    var confirmSource = submitter.closest && submitter.closest('[data-confirm]');
    var formSource = form.matches('[data-confirm]') ? form : form.closest('[data-confirm]');
    var source = confirmSource || formSource;

    if (!source) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    var options = getConfirmOptions(source);
    var title = options.title || source.getAttribute('data-confirm-title') || DEFAULT_TITLE;
    var description = options.description || source.getAttribute('data-confirm-description') || DEFAULT_DESCRIPTION;
    var confirmText = options.confirmText || source.getAttribute('data-confirm-confirm-text') || source.getAttribute('data-confirm-text') || DEFAULT_CONFIRM_TEXT;
    var cancelText = options.cancelText || source.getAttribute('data-confirm-cancel-text') || DEFAULT_CANCEL_TEXT;

    createConfirm({
      title: title,
      description: description,
      confirmText: confirmText,
      cancelText: cancelText
    }).then(function (confirmed) {
      console.log('[confirm] promise settled', confirmed);
      if (!confirmed) return;
      submitConfirmedForm(form, submitter);
    });
  }

  function initConfirmHandler() {
    if (window.__confirmHandlerInitialized) return;
    window.__confirmHandlerInitialized = true;

    document.addEventListener('submit', handleSubmit, true);
  }

  window.createConfirm = createConfirm;
  window.ConfirmHandler = {
    createConfirm: createConfirm,
    initConfirmHandler: initConfirmHandler
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfirmHandler);
  } else {
    initConfirmHandler();
  }
})();
