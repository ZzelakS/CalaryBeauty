/**
 * Type is self-hosted rather than pulled from Google Fonts: one less
 * third-party request in the critical path, no render-blocking stylesheet, and
 * the page still renders correctly offline or behind a strict CSP.
 *
 * Bodoni Moda and Karla ship as variable fonts, so the whole weight range costs
 * one file each. Space Mono is static, so only the two weights in use.
 */
import '@fontsource-variable/bodoni-moda'
import '@fontsource-variable/bodoni-moda/opsz-italic.css'
import '@fontsource-variable/karla'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
