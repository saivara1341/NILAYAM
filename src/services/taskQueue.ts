
import { TaskJob, TaskStatus } from '../types';

type TaskListener = (tasks: TaskJob[]) => void;

class TaskQueueService {
    private queue: TaskJob[] = [];
    private listeners: TaskListener[] = [];
    private processing: boolean = false;
    private maxConcurrent: number = 2; // Simulating limited consumer threads

    constructor() {
        // Load any persisted state if needed
    }

    // --- Producer: Add Job to Pipeline ---
    public addJob(topic: string, payload: any): string {
        const job: TaskJob = {
            id: Math.random().toString(36).substr(2, 9),
            topic,
            payload,
            status: 'queued',
            progress: 0,
            createdAt: new Date().toISOString()
        };
        
        this.queue.push(job);
        this.notifyListeners();
        this.processQueue(); // Trigger consumer
        return job.id;
    }

    // --- Consumer: Process Jobs ---
    private async processQueue() {
        if (this.processing) return;
        
        const activeJobs = this.queue.filter(j => j.status === 'processing');
        if (activeJobs.length >= this.maxConcurrent) return;

        const nextJob = this.queue.find(j => j.status === 'queued');
        if (!nextJob) {
            this.processing = false;
            return;
        }

        this.processing = true;
        
        // Start Processing
        this.updateJobStatus(nextJob.id, 'processing', 0);

        try {
            await this.executeJob(nextJob);
            this.updateJobStatus(nextJob.id, 'completed', 100);
        } catch (error: any) {
            console.error(`Job ${nextJob.id} failed:`, error);
            this.updateJob(nextJob.id, { status: 'failed', error: error.message });
        } finally {
            // Remove completed/failed jobs after a delay to show animation
            setTimeout(() => {
                this.queue = this.queue.filter(j => j.id !== nextJob.id);
                this.notifyListeners();
                this.processing = false;
                this.processQueue(); // Look for next
            }, 4000);
        }
    }

    // --- Execution Logic (The "Worker") ---
    private async executeJob(job: TaskJob): Promise<void> {
        // Simulate heavy backend processing with variable latency
        // In a real Kafka setup, this would be a separate consumer service.
        
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate work
            const progress = Math.round((i / steps) * 100);
            this.updateJobStatus(job.id, 'processing', progress);
        }

        // Logic based on Topic
        switch (job.topic) {
            case 'bulk_announcement':
                // API call would happen here
                console.log("Processed bulk announcement:", job.payload.title);
                break;
            case 'generate_report':
                console.log("Generated report for:", job.payload.type);
                break;
            case 'system_audit':
                console.log("Audit complete");
                break;
        }
    }

    private updateJobStatus(id: string, status: TaskStatus, progress: number) {
        this.updateJob(id, { status, progress });
    }

    private updateJob(id: string, updates: Partial<TaskJob>) {
        this.queue = this.queue.map(j => j.id === id ? { ...j, ...updates } : j);
        this.notifyListeners();
    }

    // --- Subscription ---
    public subscribe(listener: TaskListener): () => void {
        this.listeners.push(listener);
        listener(this.queue); // Initial data
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.queue));
    }

    public getTasks(): TaskJob[] {
        return this.queue;
    }
}

export const taskQueue = new TaskQueueService();
