"use strict";

const BUSINESS_CONFIG = {
  legalName: "Two River Communications, LLC",
  displayName: "Two River Communications",
  serviceArea: "The Lehigh Valley and surrounding area",
  phone: "[PHONE NUMBER]",
  email: "[EMAIL ADDRESS]",
  domain: "tworivercomms.com",
  streetAddress: "",
  businessHours: "",
  turnstileSiteKey: "0x4AAAAAAD-ZqJrwyuQvV1Kd"
};

const PLACEHOLDER_PATTERN = /^\[[^\]]+\]$/;
const TURNSTILE_SCRIPT_ID = "turnstile-api";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const isConfigured = (value) => Boolean(value && !PLACEHOLDER_PATTERN.test(value));

const setText = (selector, value) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
};

const formatTelHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;

const configureBusinessDetails = () => {
  setText('[data-business-field="phone"]', BUSINESS_CONFIG.phone);
  setText('[data-business-field="serviceArea"]', BUSINESS_CONFIG.serviceArea);

  const emailLinks = document.querySelectorAll('[data-business-field="emailLink"]');
  emailLinks.forEach((link) => {
    link.textContent = BUSINESS_CONFIG.email;
    link.href = isConfigured(BUSINESS_CONFIG.email) ? `mailto:${BUSINESS_CONFIG.email}` : "#contact";
    if (!isConfigured(BUSINESS_CONFIG.email)) {
      link.setAttribute("aria-disabled", "true");
    }
  });

  const hoursRow = document.querySelector("[data-business-hours]");
  const hoursValue = document.querySelector('[data-business-field="hours"]');
  if (hoursRow && hoursValue && isConfigured(BUSINESS_CONFIG.businessHours)) {
    hoursValue.textContent = BUSINESS_CONFIG.businessHours;
    hoursRow.hidden = false;
  }

  const callButtons = document.querySelectorAll("[data-call-button]");
  callButtons.forEach((button) => {
    if (!isConfigured(BUSINESS_CONFIG.phone)) {
      button.hidden = true;
      return;
    }
    button.hidden = false;
    button.textContent = `Call ${BUSINESS_CONFIG.phone}`;
    button.href = formatTelHref(BUSINESS_CONFIG.phone);
  });

  const footerPhone = document.querySelector("[data-footer-phone]");
  if (footerPhone && isConfigured(BUSINESS_CONFIG.phone)) {
    footerPhone.hidden = false;
    footerPhone.textContent = BUSINESS_CONFIG.phone;
    footerPhone.href = formatTelHref(BUSINESS_CONFIG.phone);
  }

  const footerEmail = document.querySelector("[data-footer-email]");
  if (footerEmail && isConfigured(BUSINESS_CONFIG.email)) {
    footerEmail.hidden = false;
    footerEmail.textContent = BUSINESS_CONFIG.email;
    footerEmail.href = `mailto:${BUSINESS_CONFIG.email}`;
  }
};

const setupCurrentYear = () => {
  const year = document.querySelector("[data-current-year]");
  if (year) {
    year.textContent = new Date().getFullYear().toString();
  }
};

const setupHeader = () => {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
};

const setupMobileMenu = () => {
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  if (!toggle || !nav) return;

  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    nav.classList.add("is-open");
    document.body.classList.add("menu-open");
    const firstLink = nav.querySelector("a");
    if (firstLink) firstLink.focus();
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;

    if (event.key === "Escape") {
      closeMenu();
      toggle.focus();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [toggle, ...Array.from(nav.querySelectorAll(focusableSelector))];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 861px)").matches) {
      closeMenu();
    }
  });
};

const setupActiveNavigation = () => {
  const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]:not(.button)'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === id);
        });
      });
    },
    { rootMargin: "-34% 0px -56% 0px", threshold: 0.01 }
  );

  sections.forEach((section) => observer.observe(section));
};

const setupRevealAnimations = () => {
  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
};

const fieldRules = {
  name: { label: "Name", required: true, max: 100 },
  company: { label: "Company or organization", required: true, max: 120 },
  email: { label: "Business email", required: true, max: 160, type: "email" },
  phone: { label: "Phone", required: true, max: 40 },
  employees: { label: "Number of employees", required: false, max: 30 },
  service: { label: "Service needed", required: true },
  message: { label: "Message", required: true, max: 2000 },
  privacy: { label: "Privacy acknowledgment", required: true, type: "checkbox" }
};

const getFieldValue = (field) => {
  if (field.type === "checkbox") return field.checked;
  return field.value.trim();
};

const setFieldError = (field, message) => {
  const error = document.getElementById(`${field.name}-error`);
  field.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) {
    error.textContent = message;
    field.setAttribute("aria-describedby", error.id);
  }
};

const validateField = (field) => {
  const rule = fieldRules[field.name];
  if (!rule) return true;

  const value = getFieldValue(field);
  let message = "";

  if (rule.required && !value) {
    message = `${rule.label} is required.`;
  } else if (rule.max && typeof value === "string" && value.length > rule.max) {
    message = `${rule.label} must be ${rule.max} characters or fewer.`;
  } else if (rule.type === "email" && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    message = "Enter a valid business email address.";
  }

  setFieldError(field, message);
  return !message;
};

const getBackendFallbackMessage = () => {
  if (isConfigured(BUSINESS_CONFIG.email)) {
    const email = BUSINESS_CONFIG.email.replace(/"/g, "");
    return `The contact form is not configured yet. Please email ${email} directly.`;
  }
  return "The contact form is not configured yet. Please use the email address once it has been added to the site.";
};

const setupContactForm = () => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector("[data-submit-button]");
  const turnstileRow = form.querySelector("[data-turnstile-row]");
  const turnstileWidget = form.querySelector("[data-turnstile-widget]");
  let turnstileWidgetId = null;
  const fields = Array.from(form.querySelectorAll("input, select, textarea")).filter((field) => field.name !== "website");

  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  const resetTurnstile = () => {
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
  };

  const turnstileIsEnabled = () => Boolean(turnstileRow && !turnstileRow.hidden);

  const setupTurnstile = () => {
    if (!turnstileRow || !turnstileWidget || !isConfigured(BUSINESS_CONFIG.turnstileSiteKey)) {
      return;
    }

    turnstileRow.hidden = false;

    const renderTurnstile = () => {
      if (!window.turnstile || turnstileWidgetId !== null) return;
      turnstileWidgetId = window.turnstile.render(turnstileWidget, {
        sitekey: turnstileWidget.dataset.sitekey || BUSINESS_CONFIG.turnstileSiteKey,
        action: turnstileWidget.dataset.action || "turnstile-spin-v2",
        "error-callback": () => setStatus("The anti-spam check could not load. Please refresh and try again.", true),
        "expired-callback": () => setStatus("The anti-spam check expired. Please try again.", true)
      });
    };

    if (window.turnstile) {
      renderTurnstile();
      return;
    }

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", renderTurnstile, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderTurnstile, { once: true });
    script.addEventListener("error", () => setStatus("The anti-spam check could not load. Please refresh and try again.", true), { once: true });
    document.head.appendChild(script);
  };

  setupTurnstile();

  fields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        validateField(field);
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    const isValid = fields.map(validateField).every(Boolean);
    if (!isValid) {
      const firstInvalid = fields.find((field) => field.getAttribute("aria-invalid") === "true");
      if (firstInvalid) firstInvalid.focus();
      setStatus("Please correct the highlighted fields.", true);
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.privacy = form.elements.privacy.checked;

    if (turnstileIsEnabled() && !payload["cf-turnstile-response"]) {
      setStatus("Please complete the anti-spam check.", true);
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success === true) {
        setStatus("Thank you. Your message was sent successfully.");
        form.reset();
        fields.forEach((field) => setFieldError(field, ""));
        resetTurnstile();
      } else if (response.status === 503) {
        setStatus(result.message || getBackendFallbackMessage(), true);
        resetTurnstile();
      } else {
        setStatus(result.message || "Your message could not be sent. Please try again or contact Two River Communications directly.", true);
        resetTurnstile();
      }
    } catch (error) {
      setStatus(getBackendFallbackMessage(), true);
      resetTurnstile();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  configureBusinessDetails();
  setupCurrentYear();
  setupHeader();
  setupMobileMenu();
  setupActiveNavigation();
  setupRevealAnimations();
  setupContactForm();
});
