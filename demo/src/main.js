import DOMPurify from 'dompurify'
import { setupApiWrapper } from './api-client.js'
import 'virtual:app-core'

window.DOMPurify = DOMPurify
setupApiWrapper()
