# Donation box map

Coverage pages (`/dashboard/boxes`, `/dashboard/admin/boxes`, `/dashboard/manager/boxes`) use the current registered-box inventory. Selecting a city fits that city's saved locations, or its city centre when none are saved. Clearing the city shows Pakistan. Super Admin city selection also updates the URL and the inventory links. City and Branch accounts continue to see only their permitted boxes, including in Pakistan view.

Each saved coordinate pair produces one GeoJSON point. Points are drawn in WebGL layers, without sampling or clustering; 40,000 located records produce 40,000 point features. Boxes sharing coordinates overlap visually and remain individually selectable in the paginated list. Missing GPS is shown separately; city centres and monthly aggregate counts never generate box points.

## Save locations

Super Admins and City/Branch Admins can select a box on the map or open its inventory Details, then enter latitude and longitude, choose a position on the coverage map, or use GPS while physically at the box. Save persists both coordinates and an audit event in one transaction. Clearing both values removes the GPS position. Box registration also accepts coordinates. Super Admins can update GPS across the network. City/Branch Admins remain scoped to their city/branch. Riders cannot edit box GPS.

## Deploy

Run `npm run migrate:box-coordinates` against each target database before enabling location writes. It adds nullable coordinate columns and a paired-coordinate constraint, preserving existing records. Fresh databases include these fields in `database/schema.sql`. Never infer exact box locations from city names or aggregate source reports.

The interactive basemap uses OpenFreeMap/OpenStreetMap tiles over the internet, with attribution in the map. No API key is needed. The Pakistan outline is a bundled public-domain Natural Earth asset; its provenance is in `public/maps/README.md`. MapLibre's worker is bundled by Next.js using its documented asset URL pattern. If WebGL or map tiles are unavailable, box search/list/details and manual coordinate editing remain available.

## Verify

- `npm run test:box-map`: 40,000-point coverage, coordinate validation, city/search/status filters, location API authorization and transaction tests; no database writes.
- `npm run test:box-map-db`: read-only comparison with the configured live database and missing-branch scope checks.
- `npm run test:box-map-db -- http://localhost:3002`: also checks authenticated national and city HTTP pages on a local server, using a short-lived test session without changing account state.
- `npm run build`: production compile, TypeScript and page generation.
