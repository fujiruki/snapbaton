import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const container = document.getElementById('snapbaton-app');
if (container) {
  createRoot(container).render(<App />);
}
