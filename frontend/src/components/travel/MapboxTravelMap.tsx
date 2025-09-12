'use client'

import React, { useEffect, useRef } from 'react'

type MapLocation = {
  id: string
  country: string
  coordinates: { lat: number; lng: number }
  totalDays: number
  hasConflicts: boolean
  confidence: number
}

export interface MapboxTravelMapProps {
  locations: MapLocation[]
  onLocationClick?: (id: string) => void
  styleId?: 'light' | 'dark' | 'streets' | 'satellite' | 'outdoors'
  routes?: Array<{ id: string; from: { lat: number; lng: number }; to: { lat: number; lng: number } }>
  showRoutes?: boolean
  animateRoutes?: boolean
}

/**
 * Lightweight Mapbox GL JS integration via CDN (no NPM dependency).
 * Loads the Mapbox script and CSS at runtime and renders circle layers.
 */
export function MapboxTravelMap({ locations, onLocationClick, styleId = 'light', routes = [], showRoutes = true, animateRoutes = true }: MapboxTravelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const animRef = useRef<number | null>(null)
  const animStateRef = useRef<{ t: number; speed: number }[]>([])

  useEffect(() => {
    // Use env token if set, otherwise fall back to a public default token provided by the project owner
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJhdmVsY2hlY2s5IiwiYSI6ImNtZmc2a2hrMDBlanAya3Bud3owbDJ5azkifQ.6GqcNoeKdceYd-0JIrCkEw'
    if (!MAPBOX_TOKEN) return

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
      if (existing) return resolve()
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load Mapbox GL JS'))
      document.head.appendChild(s)
    })

    const loadCSS = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = href
      document.head.appendChild(l)
    }

    // Load Mapbox GL JS v2 via CDN
    loadCSS('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css')
    loadScript('https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js')
      .then(() => {
        // @ts-ignore
        const mapboxgl = (window as any).mapboxgl
        if (!mapboxgl || !containerRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN

        // Initialize map
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: ((): string => {
            const styles: Record<string, string> = {
              light: 'mapbox://styles/mapbox/light-v11',
              dark: 'mapbox://styles/mapbox/dark-v11',
              streets: 'mapbox://styles/mapbox/streets-v12',
              outdoors: 'mapbox://styles/mapbox/outdoors-v12',
              satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
            }
            return styles[styleId] || styles.light
          })(),
          center: [0, 20],
          zoom: 1.2,
          attributionControl: false
        })

        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

        mapRef.current.on('load', () => {
          // Prepare GeoJSON
          const features = locations.filter(l => !!l.coordinates).map(l => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [l.coordinates.lng, l.coordinates.lat] },
            properties: {
              id: l.id,
              country: l.country,
              totalDays: l.totalDays,
              hasConflicts: l.hasConflicts,
              confidence: l.confidence,
            }
          }))

          const sourceId = 'presence-points'
          if (!mapRef.current.getSource(sourceId)) {
            mapRef.current.addSource(sourceId, {
              type: 'geojson',
              data: { type: 'FeatureCollection', features }
            })
          }

          // Optional heatmap for visual richness
          const heatId = 'presence-heat'
          if (!mapRef.current.getLayer(heatId)) {
            mapRef.current.addLayer({
              id: heatId,
              type: 'heatmap',
              source: sourceId,
              maxzoom: 6,
              paint: {
                'heatmap-weight': [
                  'interpolate', ['linear'], ['get', 'totalDays'],
                  1, 0.2,
                  30, 1
                ],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 6, 1.2],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',
                  0.2, 'rgb(103,169,207)',
                  0.4, 'rgb(209,229,240)',
                  0.6, 'rgb(253,219,199)',
                  0.8, 'rgb(239,138,98)',
                  1, 'rgb(178,24,43)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 6, 20],
                'heatmap-opacity': 0.7
              }
            })
          }

          // Circles sized by presence days and colored by conflicts/confidence
          const layerId = 'presence-circles'
          if (!mapRef.current.getLayer(layerId)) {
            mapRef.current.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              minzoom: 1,
              paint: {
                'circle-color': [
                  'case',
                  ['==', ['get', 'hasConflicts'], true], '#fb923c',
                  ['interpolate', ['linear'], ['get', 'confidence'], 0, '#ef4444', 0.6, '#eab308', 0.8, '#22c55e']
                ],
                'circle-opacity': 0.85,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1,
                'circle-radius': [
                  'interpolate', ['linear'], ['get', 'totalDays'],
                  1, 4,
                  5, 6,
                  10, 8,
                  30, 12,
                  60, 16
                ]
              }
            })
          }

          // Tooltip on hover
          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })
          mapRef.current.on('mousemove', layerId, (e: any) => {
            if (!e.features?.length) return
            const f = e.features[0]
            const html = `
              <div style="font-size:12px;">
                <strong>${f.properties.country}</strong><br/>
                Days: ${f.properties.totalDays}<br/>
                Confidence: ${Math.round((f.properties.confidence || 0) * 100)}%<br/>
                ${f.properties.hasConflicts ? '<span style="color:#b45309">Conflicts present</span>' : '<span style="color:#16a34a">No conflicts</span>'}
              </div>`
            popup.setLngLat(e.lngLat).setHTML(html).addTo(mapRef.current)
          })
          mapRef.current.on('mouseleave', layerId, () => popup.remove())

          // Click handler to notify parent
          mapRef.current.on('click', layerId, (e: any) => {
            const id = e.features?.[0]?.properties?.id as string | undefined
            if (id && onLocationClick) onLocationClick(id)
          })

          // Optional routes layers
          if (showRoutes && Array.isArray(routes) && routes.length > 0) {
            const routeFeatures = routes.map(r => ({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[r.from.lng, r.from.lat], [r.to.lng, r.to.lat]] },
              properties: { id: r.id }
            }))

            const routeSourceId = 'routes'
            if (!mapRef.current.getSource(routeSourceId)) {
              mapRef.current.addSource(routeSourceId, {
                type: 'geojson',
                lineMetrics: true,
                data: { type: 'FeatureCollection', features: routeFeatures }
              })
            }

            // Base route line
            const routeLineId = 'routes-line'
            if (!mapRef.current.getLayer(routeLineId)) {
              mapRef.current.addLayer({
                id: routeLineId,
                type: 'line',
                source: routeSourceId,
                paint: {
                  'line-color': '#6366f1',
                  'line-width': 2,
                  'line-opacity': 0.8,
                }
              })
            }

            // Glow
            const routeGlowId = 'routes-glow'
            if (!mapRef.current.getLayer(routeGlowId)) {
              mapRef.current.addLayer({
                id: routeGlowId,
                type: 'line',
                source: routeSourceId,
                paint: {
                  'line-color': '#a78bfa',
                  'line-width': 6,
                  'line-blur': 2,
                  'line-opacity': 0.2,
                }
              }, routeLineId)
            }

            // Animated points along routes
            const pointsSourceId = 'routes-points'
            if (!mapRef.current.getSource(pointsSourceId)) {
              mapRef.current.addSource(pointsSourceId, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: routeFeatures.map((f: any) => ({
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: f.geometry.coordinates[0] },
                  properties: { id: f.properties.id }
                })) }
              })
            }

            const pointsLayerId = 'routes-points-layer'
            if (!mapRef.current.getLayer(pointsLayerId)) {
              mapRef.current.addLayer({
                id: pointsLayerId,
                type: 'circle',
                source: pointsSourceId,
                paint: {
                  'circle-radius': 4,
                  'circle-color': '#22d3ee',
                  'circle-stroke-color': '#0ea5e9',
                  'circle-stroke-width': 1.5,
                }
              })
            }
          }
        })
      })
      .catch(() => {
        // swallow load error
      })

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove()
        }
      } catch {}
    }
  }, [locations, onLocationClick])

  // Update data on changes
  useEffect(() => {
    // @ts-ignore
    const mapboxgl = (window as any).mapboxgl
    const map = mapRef.current
    if (!mapboxgl || !map) return
    const source = map.getSource('presence-points') as any
    if (!source) return
    const features = locations.map(l => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.coordinates.lng, l.coordinates.lat] },
      properties: { id: l.id, country: l.country, totalDays: l.totalDays, hasConflicts: l.hasConflicts, confidence: l.confidence }
    }))
    source.setData({ type: 'FeatureCollection', features })
  }, [locations])

  // Update style when styleId changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const styles: Record<string, string> = {
      light: 'mapbox://styles/mapbox/light-v11',
      dark: 'mapbox://styles/mapbox/dark-v11',
      streets: 'mapbox://styles/mapbox/streets-v12',
      outdoors: 'mapbox://styles/mapbox/outdoors-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    }
    const uri = styles[styleId]
    if (uri) map.setStyle(uri)
  }, [styleId])

  // Update routes data and animate moving points
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const routeSource = map.getSource('routes') as any
    const pointsSource = map.getSource('routes-points') as any

    const hasRoutes = showRoutes && Array.isArray(routes) && routes.length > 0
    if (!hasRoutes) {
      try { if (map.getLayer('routes-line')) map.setLayoutProperty('routes-line', 'visibility', 'none') } catch {}
      try { if (map.getLayer('routes-glow')) map.setLayoutProperty('routes-glow', 'visibility', 'none') } catch {}
      try { if (map.getLayer('routes-points-layer')) map.setLayoutProperty('routes-points-layer', 'visibility', 'none') } catch {}
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }

    // Show
    try { if (map.getLayer('routes-line')) map.setLayoutProperty('routes-line', 'visibility', 'visible') } catch {}
    try { if (map.getLayer('routes-glow')) map.setLayoutProperty('routes-glow', 'visibility', 'visible') } catch {}
    try { if (map.getLayer('routes-points-layer')) map.setLayoutProperty('routes-points-layer', 'visibility', animateRoutes ? 'visible' : 'none') } catch {}

    const routeFeatures = routes.map(r => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[r.from.lng, r.from.lat], [r.to.lng, r.to.lat]] },
      properties: { id: r.id }
    }))
    if (routeSource && routeSource.setData) {
      routeSource.setData({ type: 'FeatureCollection', features: routeFeatures })
    }
    if (pointsSource && pointsSource.setData) {
      pointsSource.setData({ type: 'FeatureCollection', features: routeFeatures.map((f: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: f.geometry.coordinates[0] },
        properties: { id: f.properties.id }
      })) })
    }

    if (!animateRoutes || !pointsSource) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }

    // Initialize animation state
    animStateRef.current = routes.map(() => ({ t: 0, speed: 0.002 + Math.random() * 0.003 }))

    const step = () => {
      const features = routes.map((r, i) => {
        const s = animStateRef.current[i]
        s.t += s.speed
        if (s.t > 1) s.t = 0
        const lng = r.from.lng + (r.to.lng - r.from.lng) * s.t
        const lat = r.from.lat + (r.to.lat - r.from.lat) * s.t
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { id: r.id }
        }
      })
      try {
        pointsSource.setData({ type: 'FeatureCollection', features })
      } catch {}
      animRef.current = requestAnimationFrame(step)
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(step)

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [routes, showRoutes, animateRoutes])

  return (
    <div ref={containerRef} className="w-full h-96 rounded-lg overflow-hidden border border-gray-200" />
  )
}
