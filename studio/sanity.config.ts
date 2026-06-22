import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

/**
 * Sanity Studio config for the Nicolás Biondi photography portfolio.
 *
 * projectId/dataset are public identifiers (safe to commit) — they are
 * NOT secrets. The secret is the API token, which lives only in the
 * environment (never in this repo). See docs/sanity-setup.md.
 *
 * Run:   cd studio && npm install && npx sanity dev      (local editor)
 * Deploy: cd studio && npx sanity deploy                 (-> *.sanity.studio)
 */
export default defineConfig({
  name: 'nicolasbiondi',
  title: 'Nicolás Biondi — Fotografía',
  projectId: 'aqmgwuqn',
  dataset: 'production',
  plugins: [structureTool(), visionTool()],
  schema: {types: schemaTypes},
})
