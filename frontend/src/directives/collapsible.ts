import type { Directive } from 'vue';

// Makes a details section collapsible: clicking its title shows or hides everything else in the section.
// Use it on the section element: <section v-collapsible> (open) or <section v-collapsible="true"> (starts collapsed).
// The title is the direct child with the class 'detail-section-title' or 'section-title'.
// Clicks on buttons, inputs and links inside the title do not toggle the section.

const TITLE_SELECTOR = ':scope > .detail-section-title, :scope > .section-title';

interface CollapsibleState {
    collapsed: boolean;
    title?: HTMLElement;
    onClick: (event: MouseEvent) => void;
}

const states = new WeakMap<HTMLElement, CollapsibleState>();

// Vue can re-render the classes of the section and its title, so they are set again after every update
function apply(el: HTMLElement, state: CollapsibleState) {
    const title = el.querySelector<HTMLElement>(TITLE_SELECTOR) ?? undefined;
    if (title !== state.title) {
        state.title?.removeEventListener('click', state.onClick);
        title?.addEventListener('click', state.onClick);
        state.title = title;
    }
    state.title?.classList.add('collapse-toggle');
    state.title?.setAttribute('aria-expanded', String(!state.collapsed));
    el.classList.toggle('section-collapsed', state.collapsed);
}

export const vCollapsible: Directive<HTMLElement, boolean | undefined> = {
    mounted(el, binding) {
        const state: CollapsibleState = {
            collapsed: binding.value === true,
            onClick: (event: MouseEvent) => {
                const interactive = (event.target as HTMLElement).closest('button, input, select, textarea, a, label');
                if (interactive && state.title?.contains(interactive)) return;

                state.collapsed = !state.collapsed;
                apply(el, state);
            }
        };
        states.set(el, state);
        apply(el, state);
    },

    updated(el) {
        const state = states.get(el);
        if (state) apply(el, state);
    },

    unmounted(el) {
        const state = states.get(el);
        state?.title?.removeEventListener('click', state.onClick);
        states.delete(el);
    }
};
