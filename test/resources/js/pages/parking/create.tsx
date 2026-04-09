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
    MapPin, CheckCircle, AlertTriangle, Navigation,
    Camera as CameraIcon, Plus, Trash2, MousePointer,
    RotateCcw, Eye, Layers, Image as ImageIcon,
    ScanLine, Info, Check, Crown, Lock,
    ChevronRight, ChevronLeft, Building2, DollarSign, Clock, Map,
    AlertCircle,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import MapPicker from '@/components/map-picker';

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Point      = { x: number; y: number };
type Slot       = { id: number; points: Point[] };
type GateMode   = 'entrance' | 'exit';
type CameraForm = {
    name: string
    type: 'gate' | 'zone'
    stream_url: string
    gate_mode?: GateMode
};
type Props = { isPremium: boolean };

// ── COULEURS ──────────────────────────────────────────────────────────────────
const SLOT_COLORS = [
    '#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#ec4899','#14b8a6','#6366f1',
];
const getSlotColor = (i: number) => SLOT_COLORS[i % SLOT_COLORS.length];

// ── ANNOTATEUR ────────────────────────────────────────────────────────────────
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
        img.src    = imageSrc;
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
                    ? drawing.length===0 ? 'Click 4 corners of a parking spot.' : `${drawing.length}/4 points`
                    : 'Click a spot to select it, then delete it below.'}
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

// ── BLOC UPGRADE ──────────────────────────────────────────────────────────────
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
                        Draw exact boundaries of each parking spot for precise AI detection.
                    </p>
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

// ── STEPS ─────────────────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, title: 'Basic Info',    icon: Building2,    desc: 'Name, city, description' },
    { id: 2, title: 'Location',      icon: Map,          desc: 'GPS coordinates and address' },
    { id: 3, title: 'Configuration', icon: DollarSign,   desc: 'Spots, price, hours' },
    { id: 4, title: 'Media & AI',    icon: ImageIcon,    desc: 'Photos, annotations, cameras' },
];

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function CreateParking({ isPremium }: Props) {
    const { flash, errors: pageErrors } = usePage().props as any;

    const [currentStep, setCurrentStep] = useState(1);

    const [fields, setFields] = useState({
        name: '', description: '', latitude: '', longitude: '',
        address_label: '', total_spots: '', price_per_hour: '',
        opening_time: '', closing_time: '', is_24h: false,
        city: '', cancel_time_limit: '30',
    });

    const [photo,           setPhoto]           = useState<File | null>(null);
    const [annotationFile,  setAnnotationFile]  = useState<File | null>(null);
    const [slots,           setSlots]           = useState<Slot[]>([]);
    const [cameras,         setCameras]         = useState<CameraForm[]>([]);
    const [photoPreview,    setPhotoPreview]    = useState<string | null>(null);
    const [annotPreview,    setAnnotPreview]    = useState<string | null>(null);
    const [clientErrors,    setClientErrors]    = useState<Record<string,string>>({});
    const [isLocating,      setIsLocating]      = useState(false);
    const [processing,      setProcessing]      = useState(false);

    const serverErrors: Record<string,string> = pageErrors || {};
    const getError = (field: string) => clientErrors[field] || serverErrors[field];

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

    const addCamera = () => setCameras(prev => [...prev, { name: '', type: 'zone', stream_url: '', gate_mode: 'entrance' }]);
    const removeCamera = (i: number) => setCameras(prev => prev.filter((_,idx) => idx !== i));

    const updateCamera = (i: number, field: keyof CameraForm, value: string) =>
        setCameras(prev => prev.map((c, idx) => {
            if (idx !== i) return c;
            const updated = { ...c, [field]: value };
            if (field === 'type' && value === 'gate' && !updated.gate_mode) {
                updated.gate_mode = 'entrance';
            }
            if (field === 'type' && value === 'zone') {
                updated.gate_mode = undefined;
            }
            return updated;
        }));

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

    const handleAnnotationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setAnnotationFile(file);
        setAnnotPreview(null);
        setSlots([]);
        
        if (!file) {
            setClientErrors(p => {
                const c = { ...p };
                delete c.annotation_file;
                delete c.slots;
                return c;
            });
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            setClientErrors(p => ({ ...p, annotation_file: 'Max 10MB.' }));
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            setClientErrors(p => ({ ...p, annotation_file: 'Must be an image.' }));
            return;
        }
        
        setClientErrors(p => {
            const c = { ...p };
            delete c.annotation_file;
            delete c.slots;
            return c;
        });
        
        const reader = new FileReader();
        reader.onload = ev => {
            setAnnotPreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const canGoNext = () => {
        if (currentStep === 1) {
            return fields.name.trim() && fields.city.trim();
        }
        if (currentStep === 2) {
            return fields.latitude && fields.longitude && !getError('latitude') && !getError('longitude');
        }
        if (currentStep === 3) {
            return fields.total_spots && fields.price_per_hour && fields.cancel_time_limit && 
                   !getError('total_spots') && !getError('price_per_hour') && !getError('cancel_time_limit');
        }
        return true;
    };

    const nextStep = () => {
        if (!canGoNext()) {
            toast.error('Please fill all required fields correctly');
            return;
        }
        if (currentStep < STEPS.length) setCurrentStep(c => c + 1);
    };

    const prevStep = () => { if (currentStep > 1) setCurrentStep(c => c - 1); };

    // ✅ FONCTION DE VALIDATION DIRECTE (sans dépendance au state)
    const validateForm = useCallback((): Record<string, string> => {
        const errors: Record<string, string> = {};
        
        // Validation basique
        if (!fields.name.trim()) errors.name = 'Name is required.';
        if (!fields.city.trim()) errors.city = 'City is required.';
        
        const lat = parseFloat(fields.latitude);
        const lng = parseFloat(fields.longitude);
        if (!fields.latitude || isNaN(lat) || lat < -90 || lat > 90) 
            errors.latitude = 'Between -90 and 90.';
        if (!fields.longitude || isNaN(lng) || lng < -180 || lng > 180) 
            errors.longitude = 'Between -180 and 180.';
        
        const totalSpots = parseInt(fields.total_spots);
        const pricePerHour = parseFloat(fields.price_per_hour);
        const cancelLimit = parseInt(fields.cancel_time_limit);
        
        if (!fields.total_spots || isNaN(totalSpots) || totalSpots < 1) 
            errors.total_spots = 'At least 1 spot.';
        if (!fields.price_per_hour || isNaN(pricePerHour) || pricePerHour < 0) 
            errors.price_per_hour = 'Cannot be negative.';
        if (!fields.cancel_time_limit || isNaN(cancelLimit) || cancelLimit < 10 || cancelLimit > 1000) 
            errors.cancel_time_limit = 'Between 10 and 1000 min.';
        
        // Validation photo
        if (!photo) {
            errors.photo = 'Photo is required.';
        }
        
        // ✅ VALIDATION MATCHING SLOTS - Directe, sans dépendance d'état
        if (isPremium && annotationFile && annotPreview && totalSpots > 0) {
            const currentSlots = slots.length;
            if (currentSlots !== totalSpots) {
                errors.slots = `You annotated ${currentSlots} spot(s), but declared ${totalSpots}. They must match.`;
            }
        }
        
        return errors;
    }, [fields, photo, isPremium, annotationFile, annotPreview, slots]);

    // ✅ HANDLE SUBMIT - Validation directe
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // ✅ Appel de validation qui retourne un objet frais
        const errors = validateForm();
        
        // Log pour debug
        console.log('🔍 Validation Errors:', errors);
        console.log('📊 Slots Annotated:', slots.length, '| Total Declared:', fields.total_spots);
        
        // Mettre à jour l'état pour l'affichage (optionnel, juste pour UI)
        setClientErrors(errors);
        
        // ✅ Vérification IMMEDIATE - pas de dépendance au state
        if (Object.keys(errors).length > 0) {
            const errorCount = Object.keys(errors).length;
            const errorFields = Object.keys(errors).join(', ');
            
            toast.error(`Please fix ${errorCount} error(s) before submitting`, {
                description: `Fields with errors: ${errorFields}`,
                duration: 5000,
            });
            
            // Redirection vers l'étape concernée
            if (errors.slots || errors.annotation_file || errors.photo) {
                setCurrentStep(4);
            } else if (errors.total_spots || errors.price_per_hour || errors.cancel_time_limit) {
                setCurrentStep(3);
            } else if (errors.latitude || errors.longitude) {
                setCurrentStep(2);
            } else {
                setCurrentStep(1);
            }
            
            return; // ✅ STOP ICI - Ne pas soumettre
        }
        
        // ✅ Si on arrive ici, AUCUNE ERREUR - Soumission
        console.log('✅ All validations passed - Submitting form...');
        
        const formData = new FormData();
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
        formData.append('photo',             photo);
        
        if (isPremium && annotationFile && slots.length > 0) {
            formData.append('annotation_file', annotationFile);
            formData.append('slots', JSON.stringify(slots));
        } else {
            formData.append('slots', '[]');
        }
        
        formData.append('cameras', JSON.stringify(cameras));

        setProcessing(true);
        
        router.post('/parkings', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('🎉 Parking created successfully!', {
                    description: `${fields.name} has been added to your parkings`,
                    duration: 5000,
                });
            },
            onError: (errors) => {
                console.error('❌ Server Errors:', errors);
                const firstError = Object.values(errors)[0] as string;
                toast.error('Failed to create parking', {
                    description: firstError,
                    duration: 6000,
                });
                
                if (errors.slots) setCurrentStep(4);
                if (errors.total_spots || errors.price_per_hour) setCurrentStep(3);
                if (errors.latitude || errors.longitude) setCurrentStep(2);
                if (errors.name || errors.city) setCurrentStep(1);
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AppLayout breadcrumbs={[
            {title:'My Parkings', href:'/parkings'},
            {title:'Add',         href:'/parkings/create'},
        ]}>
            <Head title="Add Parking"/>
            <div className="mx-auto max-w-3xl py-8 px-4">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold">Add a Parking</h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isPremium?'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300':'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {isPremium && <Crown className="h-3 w-3"/>}
                        {isPremium ? 'Premium Plan' : 'Basic Plan'}
                    </span>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
                        <CheckCircle className="h-5 w-5 shrink-0"/><p>{flash.success}</p>
                    </div>
                )}
                {flash?.warning && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5 shrink-0"/><p>{flash.warning}</p>
                    </div>
                )}
                {serverErrors?.limit && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
                        <AlertTriangle className="h-5 w-5 shrink-0"/><p>{serverErrors.limit}</p>
                    </div>
                )}

                {/* ✅ Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute top-5 left-0 right-0 h-1 bg-muted -z-10">
                            <div className="h-full bg-primary transition-all duration-300"
                                style={{width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`}}/>
                        </div>
                        
                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            
                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                    <button
                                        type="button"
                                        onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                                        disabled={step.id > currentStep}
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                                            isActive
                                                ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-110'
                                                : isCompleted
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-muted-foreground/30 bg-muted text-muted-foreground'
                                        } ${step.id < currentStep ? 'cursor-pointer hover:scale-105' : ''}`}>
                                        {isCompleted && !isActive ? (
                                            <Check className="h-5 w-5"/>
                                        ) : (
                                            <Icon className="h-5 w-5"/>
                                        )}
                                    </button>
                                    <div className="text-center">
                                        <p className={`text-xs font-semibold ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground hidden sm:block max-w-[80px]">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ✅ STEP 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary"/>
                                    Basic Information
                                </h2>

                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Parking Name *</Label>
                                        <Input id="name" value={fields.name}
                                            onChange={e=>setField('name',e.target.value)}
                                            onBlur={e=>validateField('name',e.target.value)}
                                            placeholder="My Parking"
                                            className={getError('name')?'border-red-500':''}/>
                                        <InputError message={getError('name')}/>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City *</Label>
                                        <Input id="city" value={fields.city}
                                            onChange={e=>setField('city',e.target.value)}
                                            onBlur={e=>validateField('city',e.target.value)}
                                            placeholder="Tunis"
                                            className={getError('city')?'border-red-500':''}/>
                                        <InputError message={getError('city')}/>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description (Optional)</Label>
                                        <textarea id="description" value={fields.description}
                                            onChange={e=>setField('description',e.target.value)}
                                            placeholder="Describe your parking..."
                                            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                                            rows={3} maxLength={1000}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ✅ STEP 2: Location */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Map className="h-5 w-5 text-primary"/>
                                        Location
                                    </h2>
                                    <Button type="button" variant="outline" size="sm"
                                        onClick={getCurrentLocation} disabled={isLocating}>
                                        {isLocating
                                            ? <><Spinner className="mr-2 h-4 w-4"/> Locating...</>
                                            : <><Navigation className="mr-1 h-4 w-4"/> Use GPS</>}
                                    </Button>
                                </div>

                                <MapPicker
                                    latitude={fields.latitude ? parseFloat(fields.latitude) : null}
                                    longitude={fields.longitude ? parseFloat(fields.longitude) : null}
                                    onLocationSelect={handleLocationSelect}
                                    height="400px"/>

                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <div className="grid gap-2">
                                        <Label>Latitude *</Label>
                                        <Input type="number" step="any" value={fields.latitude}
                                            onChange={e=>setField('latitude',e.target.value)}
                                            onBlur={e=>validateField('latitude',e.target.value)}
                                            placeholder="36.8065"
                                            className={getError('latitude')?'border-red-500':''}/>
                                        <InputError message={getError('latitude')}/>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Longitude *</Label>
                                        <Input type="number" step="any" value={fields.longitude}
                                            onChange={e=>setField('longitude',e.target.value)}
                                            onBlur={e=>validateField('longitude',e.target.value)}
                                            placeholder="10.1815"
                                            className={getError('longitude')?'border-red-500':''}/>
                                        <InputError message={getError('longitude')}/>
                                    </div>
                                </div>

                                {fields.address_label && (
                                    <div className="flex items-start gap-2 rounded-lg bg-muted p-3 mt-4">
                                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"/>
                                        <p className="text-sm text-muted-foreground">{fields.address_label}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ✅ STEP 3: Configuration */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary"/>
                                    Configuration
                                </h2>

                                <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Total Spots *</Label>
                                            <Input type="number" min="1" value={fields.total_spots}
                                                onChange={e=>setField('total_spots',e.target.value)}
                                                onBlur={e=>validateField('total_spots',e.target.value)}
                                                placeholder="50"
                                                className={getError('total_spots')?'border-red-500':''}/>
                                            <InputError message={getError('total_spots')}/>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Price / Hour (TND) *</Label>
                                            <Input type="number" step="0.01" min="0" value={fields.price_per_hour}
                                                onChange={e=>setField('price_per_hour',e.target.value)}
                                                onBlur={e=>validateField('price_per_hour',e.target.value)}
                                                placeholder="2.00"
                                                className={getError('price_per_hour')?'border-red-500':''}/>
                                            <InputError message={getError('price_per_hour')}/>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="cancel_time_limit">Cancel Time Limit (minutes) *</Label>
                                        <Input id="cancel_time_limit" type="number"
                                            value={fields.cancel_time_limit}
                                            onChange={e=>setField('cancel_time_limit',e.target.value)}
                                            onBlur={e=>validateField('cancel_time_limit',e.target.value)}
                                            placeholder="30"
                                            className={getError('cancel_time_limit')?'border-red-500':''}/>
                                        <InputError message={getError('cancel_time_limit')}/>
                                    </div>

                                    <div className="space-y-3 rounded-lg border p-4 bg-background">
                                        <Label className="text-base font-semibold flex items-center gap-2">
                                            <Clock className="h-4 w-4"/>
                                            Hours
                                        </Label>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                                         {/* ✅ STEP 4: Media & AI */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            
                            

                            {/* Photo */}
                            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-primary"/>
                                    Parking Photo *
                                </h2>
                                <Input type="file" accept="image/*" onChange={handlePhotoChange}
                                    className={getError('photo')?'border-red-500':''}/>
                                <InputError message={getError('photo')}/>
                                {photoPreview && (
                                    <div className="mt-4 relative inline-block">
                                        <img src={photoPreview} alt="Preview"
                                            className="h-32 rounded-lg border object-cover shadow-sm"/>
                                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">LOGO</div>
                                    </div>
                                )}
                            </div>

                            {/* ✅ Annotation Premium */}
                            {isPremium ? (
                                <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20 p-6">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div>
                                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                                <ScanLine className="h-5 w-5 text-indigo-600"/>
                                                Spot Annotation
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                                    <Crown className="h-2.5 w-2.5"/> Premium
                                                </span>
                                            </h2>
                                            <p className="text-sm text-muted-foreground mt-1">Upload top-view image and annotate spots</p>
                                        </div>
                                        
                                        {/* ✅ Indicateur Matching */}
                                        {annotPreview && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
                                                slots.length === Number(fields.total_spots) && slots.length > 0
                                                    ? 'bg-green-100 text-green-700 border-2 border-green-300 dark:bg-green-950/40 dark:text-green-300'
                                                    : slots.length > Number(fields.total_spots)
                                                    ? 'bg-red-100 text-red-700 border-2 border-red-300 dark:bg-red-950/40 dark:text-red-300'
                                                    : slots.length > 0
                                                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                                    : 'bg-gray-100 text-gray-600 border-2 border-gray-300 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {slots.length === Number(fields.total_spots) && slots.length > 0 ? (
                                                    <>
                                                        <Check className="h-4 w-4"/>
                                                        {slots.length}/{fields.total_spots || 0} Matched
                                                    </>
                                                ) : slots.length > Number(fields.total_spots) ? (
                                                    <>
                                                        <AlertTriangle className="h-4 w-4"/>
                                                        {slots.length}/{fields.total_spots || 0} Too Many
                                                    </>
                                                ) : slots.length > 0 ? (
                                                    <>
                                                        <Info className="h-4 w-4"/>
                                                        {slots.length}/{fields.total_spots || 0} Incomplete
                                                    </>
                                                ) : (
                                                    <>
                                                        <Layers className="h-4 w-4"/>
                                                        0/{fields.total_spots || 0} Not Started
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <Input type="file" accept="image/*"
                                            onChange={handleAnnotationFileChange}
                                            className={getError('annotation_file')?'border-red-500':''}/>
                                        <InputError message={getError('annotation_file')}/>
                                        
                                        {annotPreview && (
                                            <div className="space-y-4">
                                                <SpotAnnotator imageSrc={annotPreview} slots={slots} onChange={setSlots}/>
                                                
                                                {/* Messages de validation */}
                                                {slots.length > 0 && slots.length !== Number(fields.total_spots) && (
                                                    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                                                        slots.length > Number(fields.total_spots)
                                                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
                                                            : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                                                    }`}>
                                                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5"/>
                                                        <div>
                                                            <p className="font-semibold">
                                                                {slots.length > Number(fields.total_spots)
                                                                    ? 'Too many spots annotated'
                                                                    : 'Missing annotations'}
                                                            </p>
                                                            <p className="mt-1">
                                                                {slots.length > Number(fields.total_spots)
                                                                    ? `You annotated ${slots.length} spots but declared ${fields.total_spots} total spots. Remove ${slots.length - Number(fields.total_spots)} annotation(s).`
                                                                    : `You annotated ${slots.length} spots but declared ${fields.total_spots} total spots. Add ${Number(fields.total_spots) - slots.length} more annotation(s).`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {slots.length > 0 && slots.length === Number(fields.total_spots) && (
                                                    <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
                                                        <Check className="h-5 w-5 shrink-0"/>
                                                        <p>
                                                            <strong>Perfect match!</strong> All {slots.length} spots have been annotated correctly.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {getError('slots') && (
                                        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                                            <div>
                                                <p className="font-semibold">Annotation Error</p>
                                                <p className="mt-1">{getError('slots')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <PremiumUpgradeBlock/>
                            )}

                            {/* Cameras */}
                            <div className="space-y-4 rounded-lg border p-5 bg-muted/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-base font-semibold flex items-center gap-2">
                                            <CameraIcon className="h-5 w-5 text-primary"/> Cameras (Optional)
                                        </Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Add IP cameras or DroidCam URLs.
                                        </p>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={addCamera}>
                                        <Plus className="mr-1 h-4 w-4"/> Add
                                    </Button>
                                </div>

                                {cameras.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg bg-background">
                                        No cameras added yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cameras.map((camera, index) => (
                                            <div key={index} className="flex flex-col gap-4 p-5 border rounded-lg bg-background relative shadow-sm">
                                                <Button type="button" variant="ghost" size="icon"
                                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                                    onClick={() => removeCamera(index)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>

                                                <div className="grid md:grid-cols-2 gap-4 pr-8">
                                                    <div className="grid gap-2">
                                                        <Label>Camera Name</Label>
                                                        <Input placeholder="Main Entrance"
                                                            value={camera.name}
                                                            onChange={e => updateCamera(index, 'name', e.target.value)}/>
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label>Type</Label>
                                                        <select
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                            value={camera.type}
                                                            onChange={e => updateCamera(index, 'type', e.target.value)}>
                                                            <option value="zone">Zone (Spot detection)</option>
                                                            <option value="gate">Gate (License plates)</option>
                                                        </select>
                                                    </div>

                                                    <div className="grid gap-2 md:col-span-2">
                                                        <Label>Stream URL</Label>
                                                        <Input type="url"
                                                            placeholder="http://192.168.1.XX:4747/video"
                                                            value={camera.stream_url}
                                                            onChange={e => updateCamera(index, 'stream_url', e.target.value)}/>
                                                    </div>

                                                    {camera.type === 'gate' && (
                                                        <div className="grid gap-3 md:col-span-2">
                                                            <Label>Barrier Mode</Label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {([
                                                                    {
                                                                        value: 'entrance' as GateMode,
                                                                        emoji: '🚗',
                                                                        label: 'Entrance',
                                                                        desc:  'Incoming vehicles',
                                                                        activeClass: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
                                                                        inactiveClass: 'border-border text-muted-foreground hover:border-green-300',
                                                                    },
                                                                    {
                                                                        value: 'exit' as GateMode,
                                                                        emoji: '🚙',
                                                                        label: 'Exit',
                                                                        desc:  'Outgoing vehicles',
                                                                        activeClass: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
                                                                        inactiveClass: 'border-border text-muted-foreground hover:border-red-300',
                                                                    },
                                                                ]).map(opt => (
                                                                    <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        onClick={() => updateCamera(index, 'gate_mode', opt.value)}
                                                                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                                                                            camera.gate_mode === opt.value
                                                                                ? opt.activeClass
                                                                                : opt.inactiveClass
                                                                        }`}>
                                                                        <span className="text-2xl">{opt.emoji}</span>
                                                                        <span className="font-semibold">{opt.label}</span>
                                                                        <span className="text-[11px] opacity-70">{opt.desc}</span>
                                                                        {camera.gate_mode === opt.value && (
                                                                            <Check className="h-4 w-4 mt-1"/>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ✅ Navigation Buttons */}
                    <div className="flex gap-4 pt-6 border-t">
                        {currentStep > 1 && (
                            <Button type="button" variant="outline" onClick={prevStep} disabled={processing}>
                                <ChevronLeft className="h-4 w-4 mr-1"/> Previous
                            </Button>
                        )}
                        
                        {currentStep < STEPS.length ? (
                            <Button type="button" onClick={nextStep} disabled={!canGoNext()} className="flex-1">
                                Next <ChevronRight className="h-4 w-4 ml-1"/>
                            </Button>
                        ) : (
                            <Button type="submit" className="flex-1" disabled={processing}>
                                {processing
                                    ? <><Spinner className="mr-2 h-4 w-4"/> Creating...</>
                                    : isPremium && slots.length > 0
                                        ? `Create with ${slots.length} Spot${slots.length>1?'s':''}`
                                        : '✨ Create Parking'
                                }
                            </Button>
                        )}

                        <Button type="button" variant="ghost"
                            onClick={()=>router.visit('/parkings')} disabled={processing}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
