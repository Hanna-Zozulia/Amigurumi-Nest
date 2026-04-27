(function () {
  var DEFAULT_LOADING_TEXT = 'Загрузка...';
  var ACTIVE_ATTR = 'data-loading-active';
  var FORM_ACTIVE_ATTR = 'data-form-loading-active';
  var ORIGINAL_HTML_ATTR = 'data-loading-original-html';
  var ORIGINAL_VALUE_ATTR = 'data-loading-original-value';
  var WAS_DISABLED_ATTR = 'data-loading-was-disabled';
  var OVERLAY_ID = 'global-loading-overlay';
  var overlayCounter = 0;

  function isElementLoading(element) {
    return !!element && element.getAttribute(ACTIVE_ATTR) === '1';
  }

  function isInputButton(element) {
    if (!element || element.tagName !== 'INPUT') return false;
    var type = (element.getAttribute('type') || '').toLowerCase();
    return type === 'submit' || type === 'button';
  }

  function getLoadingText(element, customText) {
    if (customText) return customText;
    if (element && element.dataset && element.dataset.loadingText) {
      return element.dataset.loadingText;
    }
    return DEFAULT_LOADING_TEXT;
  }

  function createSpinnerNode() {
    var spinner = document.createElement('span');
    spinner.className = 'spinner-border spinner-border-sm me-2';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-hidden', 'true');
    return spinner;
  }

  function createLoadingContent(text) {
    var fragment = document.createDocumentFragment();
    var spinner = createSpinnerNode();
    var label = document.createElement('span');

    label.textContent = text;
    fragment.appendChild(spinner);
    fragment.appendChild(label);

    return fragment;
  }

  function showGlobalOverlay() {
    overlayCounter += 1;

    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.className = 'global-loading-overlay d-none';
      overlay.innerHTML =
        '<div class="global-loading-overlay__content">' +
          '<span class="spinner-border text-light" role="status" aria-hidden="true"></span>' +
          '<span class="global-loading-overlay__text">Загрузка...</span>' +
        '</div>';
      document.body.appendChild(overlay);
    }

    overlay.classList.remove('d-none');
  }

  function hideGlobalOverlay(force) {
    if (force) {
      overlayCounter = 0;
    } else if (overlayCounter > 0) {
      overlayCounter -= 1;
    }

    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    if (overlayCounter === 0) {
      overlay.classList.add('d-none');
    }
  }

  function startLoading(element, options) {
    var config = options || {};

    if (!element || isElementLoading(element)) {
      return false;
    }

    var loadingText = getLoadingText(element, config.text);

    element.setAttribute(ACTIVE_ATTR, '1');
    element.setAttribute('aria-busy', 'true');
    element.classList.add('is-loading');

    if ('disabled' in element) {
      element.setAttribute(WAS_DISABLED_ATTR, element.disabled ? '1' : '0');
      element.disabled = true;
    }

    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      element.setAttribute(ORIGINAL_HTML_ATTR, element.innerHTML);
      element.innerHTML = '';
      element.appendChild(createLoadingContent(loadingText));
    } else if (isInputButton(element)) {
      element.setAttribute(ORIGINAL_VALUE_ATTR, element.value || '');
      element.value = loadingText;
    }

    if (element.tagName === 'A') {
      element.classList.add('loading-link-disabled');
      element.setAttribute('aria-disabled', 'true');
    }

    if (config.overlay) {
      showGlobalOverlay();
    }

    return true;
  }

  function stopLoading(element, options) {
    var config = options || {};

    if (!element || !isElementLoading(element)) {
      if (config.overlay) hideGlobalOverlay();
      return;
    }

    if (element.hasAttribute(ORIGINAL_HTML_ATTR)) {
      element.innerHTML = element.getAttribute(ORIGINAL_HTML_ATTR);
      element.removeAttribute(ORIGINAL_HTML_ATTR);
    }

    if (element.hasAttribute(ORIGINAL_VALUE_ATTR)) {
      element.value = element.getAttribute(ORIGINAL_VALUE_ATTR);
      element.removeAttribute(ORIGINAL_VALUE_ATTR);
    }

    if ('disabled' in element) {
      var wasDisabled = element.getAttribute(WAS_DISABLED_ATTR) === '1';
      element.disabled = wasDisabled;
      element.removeAttribute(WAS_DISABLED_ATTR);
    }

    element.classList.remove('is-loading');
    element.classList.remove('loading-link-disabled');
    element.removeAttribute('aria-disabled');
    element.removeAttribute('aria-busy');
    element.removeAttribute(ACTIVE_ATTR);

    if (config.overlay) {
      hideGlobalOverlay();
    }
  }

  function withLoading(element, asyncCallback, options) {
    if (!element || typeof asyncCallback !== 'function') {
      return Promise.resolve();
    }

    if (!startLoading(element, options)) {
      return Promise.resolve(null);
    }

    return Promise.resolve()
      .then(function () {
        return asyncCallback();
      })
      .finally(function () {
        stopLoading(element, options);
      });
  }

  function resolveEventTarget(event, explicitTarget) {
    if (explicitTarget) return explicitTarget;

    if (!event) return null;

    if (event.type === 'submit') {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) return null;

      if (event.submitter) return event.submitter;

      if (document.activeElement && form.contains(document.activeElement)) {
        return document.activeElement;
      }

      return form.querySelector('button[type="submit"], input[type="submit"], [data-loading]');
    }

    if (event.target && event.target.closest) {
      return event.target.closest('[data-loading]');
    }

    return null;
  }

  function handleLoading(event, asyncCallback, options) {
    var config = options || {};
    var target = resolveEventTarget(event, config.target);

    if (!target || typeof asyncCallback !== 'function') {
      return Promise.resolve();
    }

    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    return withLoading(target, function () {
      return asyncCallback(event, target);
    }, config);
  }

  function fetchWithLoading(element, input, init, options) {
    return withLoading(element, function () {
      return window.fetch(input, init);
    }, options);
  }

  function axiosWithLoading(element, config, options) {
    if (!window.axios) {
      return Promise.reject(new Error('Axios is not available on window.'));
    }

    return withLoading(element, function () {
      return window.axios(config);
    }, options);
  }

  function initGlobalLoading() {
    if (window.__loadingHandlerInitialized) return;
    window.__loadingHandlerInitialized = true;

    document.addEventListener('click', function (event) {
      var trigger = event.target && event.target.closest ? event.target.closest('[data-loading]') : null;
      if (!trigger) return;

      var isSubmitButton =
        trigger.matches('button[type="submit"], input[type="submit"]') ||
        (trigger.tagName === 'BUTTON' && (!trigger.getAttribute('type') || trigger.getAttribute('type') === 'submit'));

      if (isSubmitButton) {
        return;
      }

      if (isElementLoading(trigger)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      var useOverlay = trigger.hasAttribute('data-loading-overlay');
      startLoading(trigger, { overlay: useOverlay });

      if (!isSubmitButton && trigger.tagName !== 'A' && !trigger.hasAttribute('data-loading-manual')) {
        queueMicrotask(function () {
          stopLoading(trigger, { overlay: useOverlay });
        });
      }
    }, true);

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.getAttribute(FORM_ACTIVE_ATTR) === '1') {
        event.preventDefault();
        return;
      }

      var submitter = event.submitter;
      if (!submitter && document.activeElement && form.contains(document.activeElement)) {
        submitter = document.activeElement;
      }

      var target = submitter || form.querySelector('[data-loading], button[type="submit"], input[type="submit"]');
      if (!target) return;

      if (isElementLoading(target)) {
        event.preventDefault();
        return;
      }

      form.setAttribute(FORM_ACTIVE_ATTR, '1');

      var useOverlay = form.hasAttribute('data-loading-overlay') || target.hasAttribute('data-loading-overlay');
      startLoading(target, { overlay: useOverlay });
    }, true);

    window.addEventListener('pageshow', function () {
      var activeElements = document.querySelectorAll('[' + ACTIVE_ATTR + '="1"]');
      activeElements.forEach(function (element) {
        stopLoading(element);
      });

      var activeForms = document.querySelectorAll('form[' + FORM_ACTIVE_ATTR + '="1"]');
      activeForms.forEach(function (form) {
        form.removeAttribute(FORM_ACTIVE_ATTR);
      });

      hideGlobalOverlay(true);
    });

    window.addEventListener('beforeunload', function () {
      hideGlobalOverlay(true);
    });
  }

  window.LoadingHandler = {
    initGlobalLoading: initGlobalLoading,
    isElementLoading: isElementLoading,
    startLoading: startLoading,
    stopLoading: stopLoading,
    withLoading: withLoading,
    handleLoading: handleLoading,
    fetchWithLoading: fetchWithLoading,
    axiosWithLoading: axiosWithLoading,
    showGlobalOverlay: showGlobalOverlay,
    hideGlobalOverlay: hideGlobalOverlay
  };

  window.withLoading = withLoading;
  window.handleLoading = handleLoading;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalLoading);
  } else {
    initGlobalLoading();
  }
})();
