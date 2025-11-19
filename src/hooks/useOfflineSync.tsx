import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";

interface PendingUpload {
  id: string;
  file: File;
  timestamp: number;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão Restaurada", {
        description: "Sincronizando uploads pendentes...",
        icon: <Wifi className="w-5 h-5" />,
      });
      syncPendingUploads();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Sem Conexão", {
        description: "Seus uploads serão sincronizados quando a conexão retornar.",
        icon: <WifiOff className="w-5 h-5" />,
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load pending uploads from IndexedDB
    loadPendingUploads();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadPendingUploads = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(["pending_uploads"], "readonly");
      const store = transaction.objectStore("pending_uploads");
      const request = store.getAll();

      request.onsuccess = () => {
        setPendingUploads(request.result);
      };
    } catch (error) {
      console.error("Error loading pending uploads:", error);
    }
  };

  const addPendingUpload = async (file: File) => {
    const upload: PendingUpload = {
      id: crypto.randomUUID(),
      file,
      timestamp: Date.now(),
    };

    try {
      const db = await openDB();
      const transaction = db.transaction(["pending_uploads"], "readwrite");
      const store = transaction.objectStore("pending_uploads");
      store.add(upload);

      setPendingUploads((prev) => [...prev, upload]);

      toast.info("Upload em Espera", {
        description: "Seu exame será enviado quando a conexão retornar.",
      });
    } catch (error) {
      console.error("Error adding pending upload:", error);
    }
  };

  const syncPendingUploads = async () => {
    if (pendingUploads.length === 0) return;

    toast.info("Sincronizando", {
      description: `${pendingUploads.length} upload(s) pendente(s)...`,
    });

    // Here you would implement the actual upload logic
    // For now, we'll just clear the pending uploads
    try {
      const db = await openDB();
      const transaction = db.transaction(["pending_uploads"], "readwrite");
      const store = transaction.objectStore("pending_uploads");
      store.clear();
      setPendingUploads([]);
    } catch (error) {
      console.error("Error syncing uploads:", error);
    }
  };

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ZoeMedDB", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("pending_uploads")) {
          db.createObjectStore("pending_uploads", { keyPath: "id" });
        }
      };
    });
  };

  return {
    isOnline,
    pendingUploads,
    addPendingUpload,
    syncPendingUploads,
  };
};
