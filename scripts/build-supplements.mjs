import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const json = async file => JSON.parse(await readFile(file, 'utf8'));

function publicUrl(...segments) {
  return segments.join('/').replace(/^\/+|\/+$/g, '');
}

/** Build the static, Android-consumable index for published Adult weekly supplements. */
export async function buildSupplements(contentRoot) {
  const collections = [];
  const documents = [];
  const assets = [];
  let resourceCount = 0;

  for (const localeEntry of await readdir(contentRoot, { withFileTypes: true })) {
    if (!localeEntry.isDirectory() || localeEntry.name.startsWith('_')) continue;
    const locale = localeEntry.name;
    const supplementRoot = path.join(contentRoot, locale, 'adult-supplements');
    let quarters;
    try { quarters = await readdir(supplementRoot, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }

    for (const quarterEntry of quarters.filter(entry => entry.isDirectory())) {
      const quarter = quarterEntry.name;
      const sourceDir = path.join(supplementRoot, quarter);
      const collection = await json(path.join(sourceDir, 'collection.json'));
      if (collection.publicationStatus !== 'published') continue;

      const lessons = [];
      for (const lesson of collection.lessons) {
        const lessonDir = path.join(sourceDir, lesson.lessonId);
        const manifest = await json(path.join(sourceDir, lesson.manifest));
        const resources = [];

        for (const resource of manifest.resources.filter(item => item.publicationStatus === 'published')) {
          const resourceUrl = publicUrl('supplements', locale, quarter, lesson.lessonId, resource.key, 'index.json');
          const formats = [];
          for (const format of resource.formats) {
            const sourceFile = path.join(lessonDir, format.file);
            const bytes = await readFile(sourceFile);
            const resourceRelativeFile = format.file.slice(`${resource.key}/`.length);
            const assetUrl = publicUrl('supplements', locale, quarter, lesson.lessonId, resource.key, resourceRelativeFile);
            formats.push({
              mediaType: format.mediaType,
              url: assetUrl,
              bytes: bytes.byteLength,
              sha256: createHash('sha256').update(bytes).digest('hex')
            });
            assets.push({ path: assetUrl, bytes });
          }

          const outputResource = {
            id: resource.id,
            key: resource.key,
            title: resource.title,
            audienceCategory: resource.audienceCategory,
            programRole: resource.programRole,
            locale: resource.locale,
            kind: resource.kind,
            scope: resource.scope,
            studyId: resource.studyId,
            appliesToPrograms: resource.appliesToPrograms,
            source: resource.source,
            editorialType: resource.editorialType,
            translationTeam: resource.translationTeam ?? null,
            attribution: resource.attribution,
            rightsStatement: resource.rightsStatement,
            publicationStatus: resource.publicationStatus,
            revision: resource.revision,
            formats
          };
          documents.push({ path: resourceUrl, value: { schemaVersion: 'sabatku-supplement-resource-v1', ...outputResource } });
          resources.push({
            id: resource.id,
            key: resource.key,
            title: resource.title,
            kind: resource.kind,
            locale: resource.locale,
            studyId: resource.studyId,
            appliesToPrograms: resource.appliesToPrograms,
            revision: resource.revision,
            formats: formats.map(({ mediaType }) => mediaType),
            url: resourceUrl
          });
          resourceCount++;
        }

        if (resources.length) {
          const lessonResourcesUrl = publicUrl('supplements', locale, quarter, lesson.lessonId, 'resources.json');
          documents.push({
            path: lessonResourcesUrl,
            value: {
              schemaVersion: 'sabatku-supplement-resources-v1',
              locale,
              studyId: manifest.studyId,
              resources
            }
          });
          lessons.push({
            lessonId: lesson.lessonId,
            studyId: manifest.studyId,
            resourcesUrl: lessonResourcesUrl,
            resources
          });
        }
      }

      if (!lessons.length) continue;
      const collectionUrl = publicUrl('supplements', locale, quarter, 'index.json');
      documents.push({
        path: collectionUrl,
        value: {
          schemaVersion: 'sabatku-supplements-v1',
          id: collection.id,
          title: collection.title,
          locale: collection.locale,
          quarter: collection.quarter,
          audienceCategory: collection.audienceCategory,
          programRole: collection.programRole,
          revision: collection.revision,
          editionBindings: collection.editionBindings,
          lessons
        }
      });
      collections.push({
        id: collection.id,
        title: collection.title,
        locale: collection.locale,
        quarter: collection.quarter,
        audienceCategory: collection.audienceCategory,
        programRole: collection.programRole,
        revision: collection.revision,
        editionBindings: collection.editionBindings,
        url: collectionUrl
      });
    }
  }

  return {
    catalog: {
      schemaVersion: 'sabatku-supplements-catalog-v1',
      generatedAt: new Date().toISOString(),
      collections
    },
    documents,
    assets,
    resourceCount
  };
}
