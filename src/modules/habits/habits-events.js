function createHabitsEventHandlers(ctx) {
  const {
    getRoot,
    getState,
    setState,
    toggleCompletion,
    applyMooringCardState,
    updateReturnsCounter,
    updateTodayBanner,
    moveHabit,
    upsertHabit,
    saveAllHabitsFromBulkForm,
    deleteHabit,
    completeOnboarding,
    applyPetSettings,
    render,
    readHabits,
    readCompletions
  } = ctx;

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const rootContainer = getRoot();
    const state = getState();

    const mooring = target.closest('[data-mooring]');
    if (mooring instanceof HTMLElement) {
      const habitId = mooring.dataset.mooring;
      if (!habitId) return;
      const willComplete = !mooring.classList.contains('done');
      toggleCompletion(habitId, willComplete);
      applyMooringCardState(mooring, willComplete);
      updateReturnsCounter(habitId);
      updateTodayBanner();
      return;
    }

    const viewBtn = target.closest('[data-habits-view]');
    if (viewBtn instanceof HTMLElement) {
      const nextView = viewBtn.dataset.habitsView;
      if (nextView === 'day' || nextView === 'regularity') {
        setState({ viewMode: nextView });
        render();
      }
      return;
    }

    const onboardingPick = target.closest('[data-onboarding-pick]');
    if (onboardingPick instanceof HTMLElement) {
      setState({ onboardingPetKind: onboardingPick.dataset.onboardingPick || 'none' });
      render();
      return;
    }

    if (target.closest('[data-onboarding-skip]')) {
      completeOnboarding('none', '');
      return;
    }

    if (target.closest('[data-onboarding-start]') && rootContainer) {
      const nameInput = rootContainer.querySelector('[data-onboarding-pet-name]');
      const nameRaw = nameInput instanceof HTMLInputElement ? nameInput.value : '';
      completeOnboarding(state.onboardingPetKind || 'none', nameRaw);
      return;
    }

    if (target.closest('[data-open-pet-settings]')) {
      setState({ petSettingsOpen: true, panelOpen: false, editHabitId: null });
      render();
      return;
    }

    if (target.closest('[data-pet-settings-close]')) {
      setState({ petSettingsOpen: false });
      render();
      return;
    }

    if (target.closest('[data-open-habits-panel]')) {
      setState({ panelOpen: true, petSettingsOpen: false, editHabitId: null });
      render();
      return;
    }

    if (target.closest('[data-habits-panel-close]')) {
      setState({ panelOpen: false, editHabitId: null, bulkEditMode: false });
      render();
      return;
    }

    if (target.closest('[data-habits-bulk-edit-toggle]')) {
      setState({ bulkEditMode: !state.bulkEditMode, editHabitId: null });
      render();
      return;
    }

    const editButton = target.closest('[data-habit-edit]');
    if (editButton instanceof HTMLButtonElement) {
      setState({
        editHabitId: editButton.dataset.habitEdit || null,
        bulkEditMode: false,
        panelOpen: true,
        petSettingsOpen: false
      });
      render();
      return;
    }

    const deleteButton = target.closest('[data-habit-delete]');
    if (deleteButton instanceof HTMLButtonElement) {
      const habitId = deleteButton.dataset.habitDelete;
      if (!habitId) return;
      deleteHabit(habitId);
      if (state.editHabitId === habitId) setState({ editHabitId: null });
      render();
      return;
    }

    const upButton = target.closest('[data-habit-move-up]');
    if (upButton instanceof HTMLButtonElement) {
      const habitId = upButton.dataset.habitMoveUp;
      if (habitId) moveHabit(habitId, 'up');
      render();
      return;
    }

    const downButton = target.closest('[data-habit-move-down]');
    if (downButton instanceof HTMLButtonElement) {
      const habitId = downButton.dataset.habitMoveDown;
      if (habitId) moveHabit(habitId, 'down');
      render();
    }
  }

  function onSubmit(event) {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.matches('[data-habit-form]')) {
      event.preventDefault();
      const result = upsertHabit(target);
      if (!result.ok) return;
      setState({
        editHabitId: null,
        bulkEditMode: false,
        panelOpen: result.created ? false : getState().panelOpen
      });
      render();
      return;
    }

    if (target.matches('[data-habits-bulk-form]')) {
      event.preventDefault();
      if (!saveAllHabitsFromBulkForm(target)) return;
      setState({ bulkEditMode: false });
      render();
      return;
    }

    if (target.matches('[data-pet-settings-form]')) {
      event.preventDefault();
      const kind = target.querySelector('[data-pet-settings-kind]')?.value || 'none';
      const nameInput = target.querySelector('[data-pet-settings-name]');
      const nameRaw = nameInput instanceof HTMLInputElement ? nameInput.value : '';
      applyPetSettings(kind, nameRaw);
    }
  }

  function onSyncComplete() {
    setState({ habits: readHabits(), completions: readCompletions() });
    render();
  }

  return { onClick, onSubmit, onSyncComplete };
}

export { createHabitsEventHandlers };
