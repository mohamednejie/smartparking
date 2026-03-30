// resources/js/pages/parking/edit.tsx

import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import {
    MapPin, Navigation, Camera as CameraIcon, Plus, Trash2,
    MousePointer, RotateCcw, Eye, Layers, ScanLine,
    Info, Check, Crown, Lock, Image as ImageIcon,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import MapPicker from '@/components/map-picker';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type Point      = { x: number; y: number };
type Slot       = { id: number; points: Point[] };
type CameraForm = { id?: number; name: string; type: 'gate' | 'zone'; stream_url: string };

type Props = {
    isPremium: boolean;
    parking: {
        id: number;
        name: string;
        description: string | null;
        latitude: number;
        longitude: number;
        address_label: string | null;
        total_spots: number;
        price_per_hour: number;
        opening_time: string | null;
        closing_time: string | null;
        is_24h: boolean;
        photo_url: string | null;
        annotated_file_url: string | null;
        city: string;
        cancel_time_limit: number | null;
        cameras?: CameraForm[];
    };
};

// ══════════════════════════════════════════════════════════════════════════════
// COULEURS SPOTS
// ══════════════════════════════════════════════════════════════════════════════

const SLOT_COLORS = [
    '#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#ec4899','#14b8a6','#6366f1',
];
const getSlotColor = (i: number) => SLOT_COLORS[i % SLOT_COLORS.length];

// ══════════════════════════════════════════════════════════════════════════════
// ANNOTATEUR (identique à create.tsx)
// ══════════════════════════════════════════════════════════════════════════════

function SpotAnnotator({ imageSrc, slots, onChange }: {
    imageSrc: string;
    slots: Slot[];
    onChange: (slots: Slot[]) => void;
}) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef       = useRef<HTMLImageElement | null>(null);
    const [imgLoaded,  setImgLoaded]  = useState(false);
    const [drawing,    setDrawing]    = useState<Point[]>([]);
    const [hovered,    setHovered]    = useState<Point | null>(null);
    const [nextId,     setNextId]     = useState(1);
    const [selected,   setSelected]   = useState<number | null>(null);
    const [mode,       setMode]       = useState<'draw' | 'view'>('draw');

    useEffect(() => {
        const img = new Image();
        img.src   = imageSrc;
        img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    }, [imageSrc]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current, img = imgRef.current;
        if (!canvas || !img || !imgLoaded) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = canvas.width, H = canvas.height;

        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        if (mode === 'draw') { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, W, H); }

        slots.forEach((slot, idx) => {
            if (slot.points.length < 2) return;
            const color = getSlotColor(idx), isSel = selected === slot.id;
            ctx.beginPath();
            slot.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x*W, p.y*H) : ctx.lineTo(p.x*W, p.y*H));
            ctx.closePath();
            ctx.fillStyle = isSel ? color+'55' : color+'33';
            ctx.strokeStyle = color; ctx.lineWidth = isSel ? 3 : 2;
            ctx.fill(); ctx.stroke();
            const cx = slot.points.reduce((s,p)=>s+p.x*W,0)/slot.points.length;
            const cy = slot.points.reduce((s,p)=>s+p.y*H,0)/slot.points.length;
            ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif';
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
            ctx.fillText(`S${idx+1}`, cx, cy); ctx.shadowBlur=0;
            slot.points.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x*W, p.y*H, 4, 0, Math.PI*2);
                ctx.fillStyle=color; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
                ctx.fill(); ctx.stroke();
            });
        });

        if (drawing.length > 0 && mode === 'draw') {
            const pts = hovered ? [...drawing, hovered] : drawing;
            ctx.beginPath();
            pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x*W, p.y*H) : ctx.lineTo(p.x*W, p.y*H));
            if (pts.length >= 3) ctx.closePath();
            ctx.fillStyle='rgba(99,102,241,0.2)'; ctx.strokeStyle='#6366f1';
            ctx.lineWidth=2; ctx.setLineDash([6,3]); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
            drawing.forEach((p,i) => {
                ctx.beginPath(); ctx.arc(p.x*W, p.y*H, i===0?7:5, 0, Math.PI*2);
                ctx.fillStyle=i===0?'#6366f1':'#818cf8'; ctx.strokeStyle='#fff';
                ctx.lineWidth=2; ctx.fill(); ctx.stroke();
            });
        }
    }, [slots, drawing, hovered, imgLoaded, mode, selected]);

    useEffect(() => { draw(); }, [draw]);

    useEffect(() => {
        const resize = () => {
            const canvas=canvasRef.current, container=containerRef.current, img=imgRef.current;
            if (!canvas||!container||!img) return;
            canvas.width=container.clientWidth;
            canvas.height=Math.round(container.clientWidth*(img.naturalHeight/img.naturalWidth));
            draw();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [imgLoaded, draw]);

    const getRelPt = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x:(e.clientX-rect.left)/canvasRef.current!.width, y:(e.clientY-rect.top)/canvasRef.current!.height };
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode !== 'draw') {
            const pt = getRelPt(e);
            const hit = slots.find(slot => {
                if (slot.points.length < 3) return false;
                let inside=false; const pts=slot.points;
                for (let i=0,j=pts.length-1; i<pts.length; j=i++) {
                    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
                    if (((yi>pt.y)!==(yj>pt.y))&&(pt.x<(xj-xi)*(pt.y-yi)/(yj-yi)+xi)) inside=!inside;
                }
                return inside;
            });
            setSelected(hit ? hit.id : null); return;
        }
        const pt=getRelPt(e);
        if (drawing.length >= 3) {
            const first=drawing[0], W=canvasRef.current!.width, H=canvasRef.current!.height;
            if (Math.hypot((pt.x-first.x)*W,(pt.y-first.y)*H) < 15) {
                onChange([...slots,{id:nextId,points:drawing}]); setNextId(n=>n+1); setDrawing([]); return;
            }
        }
        const newPts=[...drawing,pt];
        if (newPts.length===4) { onChange([...slots,{id:nextId,points:newPts}]); setNextId(n=>n+1); setDrawing([]); }
        else setDrawing(newPts);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant={mode==='draw'?'default':'outline'}
                        onClick={()=>{setMode('draw');setDrawing([]);setSelected(null);}}>
                        <MousePointer className="h-3.5 w-3.5 mr-1.5"/> Draw Spot
                    </Button>
                    <Button type="button" size="sm" variant={mode==='view'?'default':'outline'}
                        onClick={()=>{setMode('view');setDrawing([]);}}>
                        <Eye className="h-3.5 w-3.5 mr-1.5"/> Select
                    </Button>
                    {drawing.length>0 && (
                        <Button type="button" size="sm" variant="ghost" onClick={()=>setDrawing([])}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5"/> Cancel
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5"/>
                    <span>{slots.length} spot{slots.length!==1?'s':''}</span>
                    {slots.length>0 && (
                        <Button type="button" size="sm" variant="ghost"
                            className="text-red-500 hover:text-red-700 h-6 px-2 text-xs"
                            onClick={()=>{onChange([]);setSelected(null);}}>
                            Clear all
                        </Button>
                    )}
                </div>
            </div>

            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${mode==='draw'?'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300':'bg-muted text-muted-foreground'}`}>
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0"/>
                {mode==='draw'
                    ? drawing.length===0
                        ? 'Click 4 corners of a parking spot. The polygon closes at the 4th point.'
                        : `${drawing.length}/4 points — ${drawing.length>=3?'click near 1st point to close early':'keep clicking'}`
                    : 'Click a spot to select it, then delete it below.'
                }
            </div>

            <div ref={containerRef}
                className={`relative w-full rounded-xl overflow-hidden border-2 shadow-sm ${mode==='draw'?'border-indigo-300 cursor-crosshair':'border-border cursor-pointer'}`}
                style={{background:'#0f172a'}}>
                <canvas ref={canvasRef}
                    onClick={handleClick}
                    onMouseMove={e=>{if(mode!=='draw'||drawing.length===0){setHovered(null);return;}setHovered(getRelPt(e));}}
                    onMouseLeave={()=>setHovered(null)}
                    className="block w-full"/>
            </div>

            {slots.length>0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {slots.map((slot,idx)=>(
                        <div key={slot.id}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${selected===slot.id?'ring-2 ring-offset-1':'hover:bg-muted/50'}`}
                            style={{borderColor:getSlotColor(idx),background:selected===slot.id?getSlotColor(idx)+'18':undefined}}
                            onClick={()=>{setSelected(selected===slot.id?null:slot.id);setMode('view');}}>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{background:getSlotColor(idx)}}/>
                                <span className="font-medium truncate">Spot {idx+1}</span>
                            </div>
                            <button type="button"
                                onClick={e=>{e.stopPropagation();onChange(slots.filter(s=>s.id!==slot.id));if(selected===slot.id)setSelected(null);}}
                                className="text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="h-3.5 w-3.5"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOC UPGRADE PREMIUM
// ══════════════════════════════════════════════════════════════════════════════

function PremiumUpgradeBlock() {
    return (
        <div className="relative rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20 p-6 overflow-hidden">
            <div className="absolute right-4 top-4 opacity-10"><Lock className="h-20 w-20 text-amber-500"/></div>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                    <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400"/>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        Spot Annotation
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 dark:bg-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                            <Crown className="h-2.5 w-2.5"/> Premium
                        </span>
                    </h3>
                    <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                        Upload a top-view photo or floor plan and draw the exact boundaries of each parking spot. The AI uses these annotations for precise real-time spot detection.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                        {['Per-spot occupancy detection','Infraction alerts','Annotated image generation'].map(f=>(
                            <div key={f} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                                <Check className="h-3.5 w-3.5"/> {f}
                            </div>
                        ))}
                    </div>
                    <Button type="button" size="sm"
                        className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                        onClick={()=>router.visit('/payment')}>
                        <Crown className="h-3.5 w-3.5 mr-1.5"/> Upgrade to Premium
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export default function EditParking({ parking, isPremium }: Props) {
    const { errors: pageErrors } = usePage().props as any;
    const serverErrors: Record<string,string> = pageErrors || {};

    // ── État du formulaire ────────────────────────────────────────────────────
    const [fields, setFields] = useState({
        name:              parking.name,
        description:       parking.description || '',
        latitude:          String(parking.latitude),
        longitude:         String(parking.longitude),
        address_label:     parking.address_label || '',
        total_spots:       String(parking.total_spots),
        price_per_hour:    String(parking.price_per_hour),
        opening_time:      parking.opening_time || '',
        closing_time:      parking.closing_time || '',
        is_24h:            parking.is_24h,
        city:              parking.city || '',
        cancel_time_limit: String(parking.cancel_time_limit || 30),
    });

    const [photo,           setPhoto]           = useState<File | null>(null);
    const [annotationFile,  setAnnotationFile]  = useState<File | null>(null);
    const [slots,           setSlots]           = useState<Slot[]>([]);
    const [cameras,         setCameras]         = useState<CameraForm[]>(parking.cameras || []);
    const [photoPreview,    setPhotoPreview]    = useState<string | null>(null);
    const [annotPreview,    setAnnotPreview]    = useState<string | null>(null);
    const [clientErrors,    setClientErrors]    = useState<Record<string,string>>({});
    const [isLocating,      setIsLocating]      = useState(false);
    const [processing,      setProcessing]      = useState(false);

    const getError = (field: string) => clientErrors[field] || serverErrors[field];

    // ── Validation ────────────────────────────────────────────────────────────
    const validateField = (field: string, value: string) => {
        const rules: Record<string,()=>string> = {
            name:              () => !value.trim() ? 'Name is required.' : '',
            city:              () => !value.trim() ? 'City is required.' : '',
            cancel_time_limit: () => (!value||+value<10||+value>1000) ? 'Between 10 and 1000 min.' : '',
            latitude:          () => (!value||+value<-90||+value>90)   ? 'Between -90 and 90.'    : '',
            longitude:         () => (!value||+value<-180||+value>180) ? 'Between -180 and 180.'  : '',
            total_spots:       () => (!value||+value<1) ? 'At least 1 spot.' : '',
            price_per_hour:    () => (!value||+value<0) ? 'Cannot be negative.' : '',
        };
        const error = rules[field]?.() ?? '';
        setClientErrors(prev => { const c={...prev}; error ? c[field]=error : delete c[field]; return c; });
    };

    const setField = (key: string, value: string | boolean) => {
        setFields(prev => ({...prev,[key]:value}));
        if (typeof value === 'string') validateField(key, value);
    };

    // ── Caméras ───────────────────────────────────────────────────────────────
    const addCamera    = () => setCameras(prev=>[...prev,{name:'',type:'zone',stream_url:''}]);
    const removeCamera = (i: number) => setCameras(prev=>prev.filter((_,idx)=>idx!==i));
    const updateCamera = (i: number, field: keyof CameraForm, value: string) =>
        setCameras(prev=>prev.map((c,idx)=>idx===i?{...c,[field]:value}:c));

    // ── Carte ──────────────────────────────────────────────────────────────────
    const handleLocationSelect = (lat: number, lng: number) => {
        const latStr=lat.toFixed(7), lngStr=lng.toFixed(7);
        setFields(prev=>({...prev,latitude:latStr,longitude:lngStr}));
        setClientErrors(prev=>{const c={...prev};delete c.latitude;delete c.longitude;return c;});
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latStr}&lon=${lngStr}`)
            .then(r=>r.json())
            .then(res=>{if(res.display_name) setFields(prev=>({...prev,address_label:res.display_name}));})
            .catch(()=>{});
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return alert('Geolocation not supported');
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos=>{handleLocationSelect(pos.coords.latitude,pos.coords.longitude);setIsLocating(false);},
            err=>{alert(err.message);setIsLocating(false);}
        );
    };

    // ── Photo (logo d'affichage) ───────────────────────────────────────────────
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file=e.target.files?.[0]||null;
        setPhoto(file);
        if (!file) { setPhotoPreview(null); return; }
        if (file.size>4096*1024) { setClientErrors(p=>({...p,photo:'Max 4MB.'})); return; }
        if (!file.type.startsWith('image/')) { setClientErrors(p=>({...p,photo:'Must be an image.'})); return; }
        setClientErrors(p=>{const c={...p};delete c.photo;return c;});
        const reader=new FileReader();
        reader.onload=ev=>setPhotoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Annotation file (Premium only) ────────────────────────────────────────
    const handleAnnotationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file=e.target.files?.[0]||null;
        setAnnotationFile(file);
        setAnnotPreview(null);
        setSlots([]); // Reset slots quand on change le fichier
        if (!file) return;
        if (file.size>10*1024*1024) { setClientErrors(p=>({...p,annotation_file:'Max 10MB.'})); return; }
        if (!file.type.startsWith('image/')) { setClientErrors(p=>({...p,annotation_file:'Must be an image.'})); return; }
        setClientErrors(p=>{const c={...p};delete c.annotation_file;return c;});
        const reader=new FileReader();
        reader.onload=ev=>setAnnotPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation client complète
        const toValidate = ['name','city','latitude','longitude','total_spots','price_per_hour','cancel_time_limit'];
        toValidate.forEach(f => validateField(f, String(fields[f as keyof typeof fields])));

        if (Object.keys(clientErrors).length > 0) {
            toast.error('Please fix the errors before saving.');
            return;
        }

        // ✅ FormData manuel — même approche que create.tsx
        const formData = new FormData();
        formData.append('_method',           'PUT');
        formData.append('name',              fields.name);
        formData.append('description',       fields.description);
        formData.append('latitude',          fields.latitude);
        formData.append('longitude',         fields.longitude);
        formData.append('address_label',     fields.address_label);
        formData.append('total_spots',       fields.total_spots);
        formData.append('price_per_hour',    fields.price_per_hour);
        formData.append('opening_time',      fields.opening_time);
        formData.append('closing_time',      fields.closing_time);
        formData.append('is_24h',            fields.is_24h ? '1' : '0');
        formData.append('city',              fields.city);
        formData.append('cancel_time_limit', fields.cancel_time_limit);

        // Photo — optionnelle en update
        if (photo) formData.append('photo', photo);

        // Annotation + slots — Premium uniquement
        if (isPremium && annotationFile) {
            formData.append('annotation_file', annotationFile);
        }
        formData.append('slots',   isPremium ? JSON.stringify(slots)   : '[]');
        formData.append('cameras', JSON.stringify(cameras));

        setProcessing(true);
        router.post(`/parkings/${parking.id}`, formData, {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Parking updated successfully!', {
                    description: `"${fields.name}" has been saved.`,
                });
            },
            onError: (errs) => {
                const firstMessage = Object.values(errs)[0];
                toast.error('Failed to update parking', {
                    description: firstMessage ?? 'Please check the form and try again.',
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={[
            {title:'My Parkings', href:'/parkings'},
            {title:'Edit',        href:`/parkings/${parking.id}/edit`},
        ]}>
            <Head title={`Edit — ${parking.name}`}/>

            <div className="mx-auto max-w-2xl py-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">Edit Parking</h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isPremium?'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300':'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {isPremium && <Crown className="h-3 w-3"/>}
                        {isPremium ? 'Premium Plan' : 'Basic Plan'}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ═══ Nom ═══ */}
                    <div className="grid gap-2">
                        <Label>Parking Name *</Label>
                        <Input value={fields.name}
                            onChange={e=>setField('name',e.target.value)}
                            onBlur={e=>validateField('name',e.target.value)}
                            className={getError('name')?'border-red-500':''}
                        />
                        <InputError message={getError('name')}/>
                    </div>

                    {/* ═══ City ═══ */}
                    <div className="grid gap-2">
                        <Label>City *</Label>
                        <Input value={fields.city}
                            onChange={e=>setField('city',e.target.value)}
                            onBlur={e=>validateField('city',e.target.value)}
                            className={getError('city')?'border-red-500':''}
                        />
                        <InputError message={getError('city')}/>
                    </div>

                    {/* ═══ Description ═══ */}
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <textarea value={fields.description}
                            onChange={e=>setField('description',e.target.value)}
                            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                            rows={3} maxLength={1000}
                        />
                    </div>

                    {/* ═══ Localisation ═══ */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                <MapPin className="inline h-4 w-4 mr-1"/> Location *
                            </Label>
                            <Button type="button" variant="outline" size="sm"
                                onClick={getCurrentLocation} disabled={isLocating}>
                                {isLocating
                                    ? <><Spinner className="mr-2 h-4 w-4"/> Locating...</>
                                    : <><Navigation className="mr-1 h-4 w-4"/> Use my location</>
                                }
                            </Button>
                        </div>
                        <MapPicker
                            latitude={fields.latitude ? parseFloat(fields.latitude) : null}
                            longitude={fields.longitude ? parseFloat(fields.longitude) : null}
                            onLocationSelect={handleLocationSelect}
                            height="400px"
                        />
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Latitude</Label>
                                <Input type="number" step="any" value={fields.latitude}
                                    onChange={e=>setField('latitude',e.target.value)}
                                    onBlur={e=>validateField('latitude',e.target.value)}
                                    className={getError('latitude')?'border-red-500':''}
                                />
                                <InputError message={getError('latitude')}/>
                            </div>
                            <div className="grid gap-2">
                                <Label>Longitude</Label>
                                <Input type="number" step="any" value={fields.longitude}
                                    onChange={e=>setField('longitude',e.target.value)}
                                    onBlur={e=>validateField('longitude',e.target.value)}
                                    className={getError('longitude')?'border-red-500':''}
                                />
                                <InputError message={getError('longitude')}/>
                            </div>
                        </div>
                        {fields.address_label && (
                            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"/>
                                <p className="text-sm text-muted-foreground">{fields.address_label}</p>
                            </div>
                        )}
                    </div>

                    {/* ═══ Spots + Prix ═══ */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Total Spots *</Label>
                            <Input type="number" min="1" value={fields.total_spots}
                                onChange={e=>setField('total_spots',e.target.value)}
                                onBlur={e=>validateField('total_spots',e.target.value)}
                                className={getError('total_spots')?'border-red-500':''}
                            />
                            <InputError message={getError('total_spots')}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>Price / Hour (TND) *</Label>
                            <Input type="number" step="0.01" min="0" value={fields.price_per_hour}
                                onChange={e=>setField('price_per_hour',e.target.value)}
                                onBlur={e=>validateField('price_per_hour',e.target.value)}
                                className={getError('price_per_hour')?'border-red-500':''}
                            />
                            <InputError message={getError('price_per_hour')}/>
                        </div>
                    </div>

                    {/* ═══ Horaires ═══ */}
                    <div className="space-y-3 rounded-lg border p-4">
                        <Label className="text-base font-semibold">Hours</Label>
                        <div className="flex items-center space-x-3">
                            <Checkbox id="is_24h" checked={fields.is_24h}
                                onCheckedChange={c=>setField('is_24h',!!c)}/>
                            <Label htmlFor="is_24h">Open 24/7</Label>
                        </div>
                        {!fields.is_24h && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Opening</Label>
                                    <Input type="time" value={fields.opening_time}
                                        onChange={e=>setField('opening_time',e.target.value)}/>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Closing</Label>
                                    <Input type="time" value={fields.closing_time}
                                        onChange={e=>setField('closing_time',e.target.value)}/>
                                </div>
                            </div>
                        )}
                        <div className="grid gap-2 mt-4">
                            <Label>Cancel Time Limit (minutes) *</Label>
                            <Input type="number" min="10" value={fields.cancel_time_limit}
                                onChange={e=>setField('cancel_time_limit',e.target.value)}
                                onBlur={e=>validateField('cancel_time_limit',e.target.value)}
                                className={getError('cancel_time_limit')?'border-red-500':''}
                            />
                            <InputError message={getError('cancel_time_limit')}/>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        FICHIERS — Photo + Annotation (Premium)
                    ══════════════════════════════════════════════════════════ */}
                    <div className="rounded-xl border-2 border-dashed p-5 space-y-6">
                        <h3 className="font-semibold text-base flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary"/> Parking Files
                        </h3>

                        {/* Photo / Logo */}
                        <div className="space-y-3">
                            <div>
                                <Label className="text-sm font-semibold flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4 text-blue-500"/> Parking Photo / Logo
                                    <span className="text-xs font-normal text-muted-foreground">(optional — replaces current)</span>
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">Max 4MB. Leave empty to keep the current photo.</p>
                            </div>

                            {/* Photo actuelle */}
                            {parking.photo_url && !photoPreview && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Current photo:</p>
                                    <div className="relative inline-block">
                                        <img src={parking.photo_url} alt="Current photo"
                                            className="h-32 rounded-lg border object-cover shadow-sm"/>
                                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                            CURRENT
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Input type="file" accept="image/*" onChange={handlePhotoChange}
                                className={getError('photo')?'border-red-500':''}/>
                            <InputError message={getError('photo')}/>

                            {photoPreview && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">New photo:</p>
                                    <div className="relative inline-block">
                                        <img src={photoPreview} alt="New photo preview"
                                            className="h-32 rounded-lg border object-cover shadow-sm"/>
                                        <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                            NEW
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t"/>

                        {/* Annotation File — Premium gate */}
                        {isPremium ? (
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm font-semibold flex items-center gap-2">
                                        <ScanLine className="h-4 w-4 text-indigo-500"/> Annotation File
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                            <Crown className="h-2.5 w-2.5"/> Premium
                                        </span>
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Top-view photo or floor plan for spot definition. Upload a new file to replace and re-annotate. Max 10MB.
                                    </p>
                                </div>

                                {/* Annotation actuelle */}
                                {parking.annotated_file_url && !annotPreview && (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Current annotated file:</p>
                                        <div className="relative inline-block">
                                            <img src={parking.annotated_file_url} alt="Current annotated file"
                                                className="h-32 rounded-lg border object-cover shadow-sm"/>
                                            <div className="absolute top-1 left-1 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                ANNOTATED
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Upload a new file below to replace and re-draw spots, or leave empty to keep this.
                                        </p>
                                    </div>
                                )}

                                <Input type="file" accept="image/*"
                                    onChange={handleAnnotationFileChange}
                                    className={getError('annotation_file')?'border-red-500':''}/>
                                <InputError message={getError('annotation_file')}/>

                                {annotPreview && !slots.length && (
                                    <div className="relative inline-block">
                                        <img src={annotPreview} alt="New annotation file preview"
                                            className="h-32 rounded-lg border object-cover shadow-sm opacity-80"/>
                                        <div className="absolute top-1 left-1 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                            NEW PLAN
                                        </div>
                                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                            Draw spots below ↓
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PremiumUpgradeBlock/>
                        )}
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        ANNOTATEUR — Premium + fichier chargé
                    ══════════════════════════════════════════════════════════ */}
                    {isPremium && annotPreview && (
                        <div className="space-y-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold flex items-center gap-2 text-base">
                                        <Layers className="h-5 w-5 text-indigo-600"/> Define Parking Spots
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                            <Crown className="h-2.5 w-2.5"/> Premium
                                        </span>
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Click 4 corners of each spot on your floor plan to redefine the annotation.
                                    </p>
                                </div>
                                {slots.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
                                        <Check className="h-3.5 w-3.5"/>
                                        {slots.length} spot{slots.length>1?'s':''}
                                    </div>
                                )}
                            </div>

                            <SpotAnnotator
                                imageSrc={annotPreview}
                                slots={slots}
                                onChange={setSlots}
                            />

                            {slots.length > 0 && (
                                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-400">
                                    <Check className="h-4 w-4 shrink-0"/>
                                    <span>
                                        <strong>{slots.length} spot{slots.length>1?'s':''}</strong> defined — a new annotated image will be generated on save.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ Caméras ═══ */}
                    <div className="space-y-4 rounded-lg border p-5 bg-muted/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <CameraIcon className="h-5 w-5 text-primary"/> Cameras
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage IP cameras or DroidCam URLs for this parking.
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addCamera}>
                                <Plus className="mr-1 h-4 w-4"/> Add Camera
                            </Button>
                        </div>

                        {cameras.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg bg-background">
                                No cameras configured.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cameras.map((camera, index) => (
                                    <div key={camera.id ?? index}
                                        className="flex flex-col gap-4 p-5 border rounded-lg bg-background relative shadow-sm">
                                        {/* Badge "Existing" pour les caméras déjà en DB */}
                                        {camera.id && (
                                            <div className="absolute top-2 left-2 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                                                ID #{camera.id}
                                            </div>
                                        )}
                                        <Button type="button" variant="ghost" size="icon"
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={()=>removeCamera(index)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                        <div className={`grid md:grid-cols-2 gap-4 pr-8 ${camera.id?'pt-5':''}`}>
                                            <div className="grid gap-2">
                                                <Label>Camera Name *</Label>
                                                <Input placeholder="e.g. Main Entrance"
                                                    value={camera.name}
                                                    onChange={e=>updateCamera(index,'name',e.target.value)}/>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Type *</Label>
                                                <select
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    value={camera.type}
                                                    onChange={e=>updateCamera(index,'type',e.target.value)}>
                                                    <option value="zone">Inside Zone (Spot detection)</option>
                                                    <option value="gate">Entrance/Exit Gate (License plates)</option>
                                                </select>
                                            </div>
                                            <div className="grid gap-2 md:col-span-2">
                                                <Label>Stream URL *</Label>
                                                <Input type="url"
                                                    placeholder="http://192.168.1.XX:4747/video"
                                                    value={camera.stream_url}
                                                    onChange={e=>updateCamera(index,'stream_url',e.target.value)}/>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ═══ Submit ═══ */}
                    <div className="flex gap-4 pt-4 border-t">
                        <Button type="submit" className="flex-1" disabled={processing}>
                            {processing
                                ? <><Spinner className="mr-2 h-4 w-4"/> Saving...</>
                                : isPremium && slots.length > 0
                                    ? `Update with ${slots.length} Annotated Spot${slots.length>1?'s':''}`
                                    : 'Update Parking'
                            }
                        </Button>
                        <Button type="button" variant="outline"
                            onClick={()=>router.visit('/parkings')} disabled={processing}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}