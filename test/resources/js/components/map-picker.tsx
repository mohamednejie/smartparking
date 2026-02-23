// resources/js/components/map-picker.tsx

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icône par défaut de Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

type Props = {
    latitude: number | null;
    longitude: number | null;
    onLocationSelect: (lat: number, lng: number) => void;
    height?: string;
};

export default function MapPicker({
    latitude,
    longitude,
    onLocationSelect,
    height = '400px',
}: Props) {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Position par défaut (Tunisie)
        const defaultLat = latitude || 36.8065;
        const defaultLng = longitude || 10.1815;

        // Créer la carte
        const map = L.map(containerRef.current).setView(
            [defaultLat, defaultLng],
            latitude ? 16 : 7
        );

        // Ajouter le layer OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
        }).addTo(map);

        // Ajouter un marqueur si position existante
        if (latitude && longitude) {
            markerRef.current = L.marker([latitude, longitude], {
                draggable: true,
            }).addTo(map);

            // Drag du marqueur
            markerRef.current.on('dragend', () => {
                const pos = markerRef.current?.getLatLng();
                if (pos) {
                    onLocationSelect(pos.lat, pos.lng);
                }
            });
        }

        // Clic sur la carte → placer/déplacer le marqueur
        map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng], {
                    draggable: true,
                }).addTo(map);

                markerRef.current.on('dragend', () => {
                    const pos = markerRef.current?.getLatLng();
                    if (pos) {
                        onLocationSelect(pos.lat, pos.lng);
                    }
                });
            }

            onLocationSelect(lat, lng);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Mettre à jour la position du marqueur quand lat/lng changent depuis l'extérieur
    useEffect(() => {
        if (!mapRef.current || !latitude || !longitude) return;

        if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
        } else {
            markerRef.current = L.marker([latitude, longitude], {
                draggable: true,
            }).addTo(mapRef.current);

            markerRef.current.on('dragend', () => {
                const pos = markerRef.current?.getLatLng();
                if (pos) {
                    onLocationSelect(pos.lat, pos.lng);
                }
            });
        }

        mapRef.current.setView([latitude, longitude], 16);
    }, [latitude, longitude]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-2">
            <div
                ref={containerRef}
                style={{ height, width: '100%' }}
                className="rounded-lg border overflow-hidden z-0"
            />
            <p className="text-xs text-muted-foreground">
                📍 Click on the map to set the parking location. You can also drag the marker.
            </p>
        </div>
    );
}