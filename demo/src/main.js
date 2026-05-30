import DOMPurify from 'dompurify'
import { setupApiWrapper } from './api-client.js'
import './protocol-ui.css'
import './style.css'
import './review.css'
import 'virtual:app-core'

window.DOMPurify = DOMPurify
setupApiWrapper()
