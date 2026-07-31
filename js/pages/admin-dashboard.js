import { requireAdmin } from '../guards/requireAdmin.js';
import { renderNavAuthState } from '../components/navAuthState.js';

await requireAdmin();
renderNavAuthState();
