import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Database, Loader2, DownloadCloud } from 'lucide-react';

interface BackupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BackupModal({ isOpen, onClose }: BackupModalProps) {
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const steps = [
        "Initialisation de la connexion sécurisée...",
        "Extraction des données utilisateurs...",
        "Sauvegarde des vacations et des tarifs...",
        "Compression des messages et notifications...",
        "Préparation du fichier d'export JSON...",
        "Téléchargement du fichier final..."
    ];

    useEffect(() => {
        if (isOpen) {
            setProgress(0);
            setStep(0);
            setIsCompleted(false);
            setError(null);

            startBackup();
        }
    }, [isOpen]);

    const startBackup = async () => {
        try {
            // Simulate earlier steps
            let currentProgress = 0;
            let currentStep = 0;

            const interval = setInterval(() => {
                if (currentStep < 4) {
                    currentProgress += 16;
                    currentStep += 1;
                    setProgress(currentProgress);
                    setStep(currentStep);
                } else {
                    clearInterval(interval);
                }
            }, 800);

            const response = await fetch('/api/admin/backup');

            clearInterval(interval);

            if (!response.ok) {
                throw new Error('Erreur lors de la sauvegarde. Accès refusé ou serveur injoignable.');
            }

            setStep(4);
            setProgress(85);

            const blob = await response.blob();

            setStep(5);
            setProgress(100);
            setIsCompleted(true);

            // Trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `vacationeasy_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            if (contentDisposition && contentDisposition.includes('filename=')) {
                filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (err: any) {
            setError(err.message || "Une erreur inattendue s'est produite.");
            setProgress(0);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing while downloading unless error
            if (!open && !isCompleted && !error) return;
            onClose();
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Sauvegarde de la Base de Données
                    </DialogTitle>
                    <DialogDescription>
                        Ne fermez pas cette fenêtre pendant que nous préparons votre sauvegarde complète.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {error ? (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm font-semibold break-words">
                            {error}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <Progress value={progress} className="h-3 rounded-full" />
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-muted-foreground animate-pulse">
                                        {isCompleted ? "Exportation terminée avec succès !" : steps[step]}
                                    </span>
                                    <span className="text-primary">{Math.round(progress)}%</span>
                                </div>
                            </div>

                            <div className="flex justify-center pt-2 h-16 items-center">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <Loader2 className="w-10 h-10 text-primary/50 animate-spin" />
                                )}
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={onClose}
                        disabled={!isCompleted && !error}
                        variant={isCompleted ? "default" : "outline"}
                        className="w-full"
                    >
                        {isCompleted ? "Fermer" : (error ? "Annuler" : "Sauvegarde en cours...")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
