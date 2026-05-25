import '../protocol-ui.css'
import './style.css'
import DOMPurify from 'dompurify'
import { setupApiWrapper } from './api-client.js'

// Make DOMPurify available to legacy global scripts
window.DOMPurify = DOMPurify

// Setup API wrapper with loading/retry
setupApiWrapper()
