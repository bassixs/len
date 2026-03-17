export function initAccordionGroup({
    triggerSelector,
    containerSelector,
    triggerActiveClass = 'active',
    bodyOpenClass = 'open',
    closeOthers = true,
} = {}) {
    const triggers = document.querySelectorAll(triggerSelector);
    if (!triggers.length) return;

    const container = containerSelector ? document.querySelector(containerSelector) : document;

    const allTriggers = container.querySelectorAll(triggerSelector);

    allTriggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const body = trigger.nextElementSibling;
            const isActive = trigger.classList.contains(triggerActiveClass);

            if (closeOthers) {
                allTriggers.forEach((t) => {
                    if (t === trigger) return;
                    t.classList.remove(triggerActiveClass);
                    const b = t.nextElementSibling;
                    if (b) b.classList.remove(bodyOpenClass);
                });
            }

            if (!body) return;

            if (isActive) {
                trigger.classList.remove(triggerActiveClass);
                body.classList.remove(bodyOpenClass);
            } else {
                trigger.classList.add(triggerActiveClass);
                body.classList.add(bodyOpenClass);
            }
        });
    });
}
