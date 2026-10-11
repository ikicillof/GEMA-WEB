'use client'

import { GemmaExperience } from './gemma-experience'

/** La experiencia es SVG + GSAP liviano; se monta directamente para evitar que un fallback dinámico bloquee la home. */
export function GemmaExperienceLoader() { return <GemmaExperience /> }
