// core/router.js — Navigation entre modules

let currentModule = null;
const listeners = [];

function navigate(moduleId) {
  if (currentModule === moduleId) return;
  currentModule = moduleId;
  listeners.forEach((fn) => fn(moduleId));
  history.pushState({}, '', `#${moduleId}`);
}

function getCurrentModule() {
  return currentModule || location.hash.slice(1) || 'now';
}

function onNavigate(fn) {
  listeners.push(fn);
}

export { navigate, getCurrentModule, onNavigate };
