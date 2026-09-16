import type { Rating } from '../types/vocab.js';

export interface KeyboardActions {
  flip: () => void;
  rate: (rating: Rating) => void;
  next: () => void;
  previous: () => void;
}

export function handleStudyKeydown(event: KeyboardEvent, actions: KeyboardActions): void {
  if (event.repeat) return;

  switch (event.key) {
    case ' ':
    case 'Spacebar':
      event.preventDefault();
      actions.flip();
      break;
    case '1':
      event.preventDefault();
      actions.rate(1);
      break;
    case '2':
      event.preventDefault();
      actions.rate(2);
      break;
    case '3':
      event.preventDefault();
      actions.rate(3);
      break;
    case '4':
      event.preventDefault();
      actions.rate(4);
      break;
    case 'ArrowRight':
      event.preventDefault();
      actions.next();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      actions.previous();
      break;
  }
}
