import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const json = async file => JSON.parse(await readFile(file, 'utf8'));

function publicUrl(...segments) {
  return segments.join('/').replace(/^\/+|\/+$/g, '');
}

const collectionFolders = ['adult-supplements', 'cornerstone-supplements'];

/** Build Android-consumable static indexes for weekly and quarter-level supplements. */
export async function buildSupplements(contentRoot) {
  const collections = [];
  const documents = [];
  const assets = [];
  let resourceCount = 0;

  for (const localeEntry of await readdir(contentRoot, { withFileTypes: true })) {
    if (!localeEntry.isDirectory() || localeEntry.name.startsWith('_')) continue;
    const locale = localeEntry.name;

    for (const collectionFolder of collectionFolders) {
      const supplementRoot = path.join(contentRoot, locale, collectionFolder);
      let quarters;
      try { quarters = await readdir(supplementRoot, { withFileTypes: true }); }
      catch (error) { if (error.code === 'ENOENT') continue; throw error; }

      for (const quarterEntry of quarters.filter(entry => entry.isDirectory())) {
        const quarter = quarterEntry.name;
        const sourceDir = path.join(supplementRoot, quarter);
        const collection = await json(path.join(sourceDir, 'collection.json'));
        if (collection.publicationStatus !== 'published') continue;
        const collectionSlug = collectionFolder === 'adult-supplements' ? [] : [collectionFolder.replace(/-supplements$/, '')];
        const publicRoot = ['supplements', locale, ...collectionSlug, quarter];

        const publishManifest = async ({ entry, scope, folder }) => {
          const manifest = await json(path.join(sourceDir, entry.manifest));
          const resources = [];
          const targetId = scope === 'weekly' ? entry.lessonId : entry.resourceId;
          const targetPath = [...publicRoot, targetId];
          for (const resource of manifest.resources.filter(item => item.publicationStatus === 'published')) {
            const resourceUrl = publicUrl(...targetPath, resource.key, 'index.json');
            const formats = [];
            for (const format of resource.formats) {
              const sourceFile = path.join(folder, format.file);
              const sourceBytes = await readFile(sourceFile);
              // Publish identical Markdown bytes on Windows and Linux.
              const bytes = format.mediaType === 'text/markdown'
                ? Buffer.from(sourceBytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8')
                : sourceBytes;
              const resourceRelativeFile = format.file.slice(`${resource.key}/`.length);
              const assetUrl = publicUrl(...targetPath, resource.key, resourceRelativeFile);
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
              scope: resource.scope,
              audienceCategory: resource.audienceCategory,
              locale: resource.locale,
              studyId: resource.studyId,
              appliesToPrograms: resource.appliesToPrograms,
              revision: resource.revision,
              formats: formats.map(({ mediaType }) => mediaType),
              url: resourceUrl
            });
            resourceCount++;
          }

          if (!resources.length) return null;
          const resourcesUrl = publicUrl(...targetPath, 'resources.json');
          documents.push({
            path: resourcesUrl,
            value: { schemaVersion: 'sabatku-supplement-resources-v1', locale, studyId: manifest.studyId, resources }
          });
          return { targetId, studyId: manifest.studyId, resourcesUrl, resources };
        };

        const lessons = [];
        for (const lesson of collection.lessons) {
          const publishedLesson = await publishManifest({
            entry: lesson,
            scope: 'weekly',
            folder: path.join(sourceDir, lesson.lessonId)
          });
          if (publishedLesson) lessons.push({ lessonId: lesson.lessonId, studyId: publishedLesson.studyId, resourcesUrl: publishedLesson.resourcesUrl, resources: publishedLesson.resources });
        }

        const quarterResources = [];
        for (const resource of collection.quarterResources ?? []) {
          const publishedResource = await publishManifest({
            entry: resource,
            scope: 'quarterly',
            folder: path.join(sourceDir, resource.resourceId)
          });
          if (publishedResource) quarterResources.push({ resourceId: resource.resourceId, studyId: publishedResource.studyId, resourcesUrl: publishedResource.resourcesUrl, resources: publishedResource.resources });
        }

        if (!lessons.length && !quarterResources.length) continue;
        const collectionUrl = publicUrl(...publicRoot, 'index.json');
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
            lessons,
            quarterResources
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
  }

  return {
    catalog: { schemaVersion: 'sabatku-supplements-catalog-v1', generatedAt: new Date().toISOString(), collections },
    documents,
    assets,
    resourceCount
  };
}
