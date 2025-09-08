export interface AppUser {
  uid: string;
  email: string | null;
  username: string;
  password?: string; // WARNING: Insecure, for prototype only
  role: 'user' | 'admin';
  nom: string;
  prenom: string;
  fonction: 'technicien d\'anesthesie' | 'instrumentiste' | 'panseur';
}

export type VacationStatus = 'En attente' | 'Validée' | 'Refusée';

export interface Vacation {
  id: string;
  userId: string;
  // Date is stored as a string to be serializable and compatible with local data
  date: string; 
  time: string;
  patientName: string;
  matricule: string;
  surgeon: string;
  operation: string;
  reason: 'Astreinte A.M' | 'Necessite du travail' | 'Astreinte nuit' | 'Astreinte matin';
  type: 'acte' | 'forfait';
  amount: number;
  status: VacationStatus;
  user?: { // Optional, denormalized for admin view
    username?: string;
  };
}

export interface Surgeon {
    id: number;
    name: string;
}

// DTO is no longer needed as we're not using Firestore Timestamps
export type VacationDTO = Vacation;

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  read: number; // 0 for unread, 1 for read
  createdAt: string;
  senderName: string;
}

export interface VacationAmount {
  fonction: 'technicien d\'anesthesie' | 'instrumentiste' | 'panseur';
  motif: 'Astreinte A.M' | 'Necessite du travail' | 'Astreinte nuit' | 'Astreinte matin';
  type: 'acte' | 'forfait';
  amount: number;
}
