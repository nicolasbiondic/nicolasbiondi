import {defineField, defineType} from 'sanity'

/**
 * A "collection" is one photo gallery (a project) that belongs to one of the
 * four site categories. The home "Portafolio" is a curated view, so a
 * collection can also be flagged `featured` to surface on the home page.
 *
 * Drag-and-drop:
 *  - `images[]` is an ordered array — drag to reorder the gallery.
 *  - drag files straight into the images field to upload.
 * The array order here IS the gallery order rendered on the site.
 */
export const collection = defineType({
  name: 'collection',
  title: 'Colección',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'category',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          {title: 'Portafolio (home)', value: 'portafolio'},
          {title: 'Comercial', value: 'comercial'},
          {title: 'Personal', value: 'personal'},
          {title: 'Eventos', value: 'eventos'},
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Destacada en home (Portafolio)',
      type: 'boolean',
      initialValue: false,
      description: 'Si está activo, la colección aparece en la galería principal del portafolio.',
    }),
    defineField({
      name: 'order',
      title: 'Orden dentro de la categoría',
      type: 'number',
      description: 'Menor = primero. Las colecciones de una categoría se ordenan por este número.',
      initialValue: 0,
    }),
    defineField({
      name: 'cover',
      title: 'Portada (opcional)',
      type: 'image',
      options: {hotspot: true},
      description: 'Si se deja vacío, se usa la primera foto de la galería.',
    }),
    defineField({
      name: 'images',
      title: 'Fotos (arrastra para reordenar)',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {name: 'alt', title: 'Texto alternativo', type: 'string'},
          ],
        },
      ],
      options: {layout: 'grid'},
      validation: (r) => r.min(1),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Fecha',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  orderings: [
    {
      title: 'Categoría, luego orden',
      name: 'categoryOrder',
      by: [
        {field: 'category', direction: 'asc'},
        {field: 'order', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'title', category: 'category', media: 'cover', img0: 'images.0'},
    prepare({title, category, media, img0}) {
      return {title, subtitle: category, media: media || img0}
    },
  },
})
