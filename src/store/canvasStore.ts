import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Note {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string; // Description text
  type: 'card' | 'sticky' | 'text'; // 'card' has the header strip, 'sticky' is full color, 'text' is transparent
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
  tags?: string[];
  imageUrl?: string;
  width?: number;
  height?: number;
  collaborators?: string[]; // URLs or initials
}

export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    sourceHandle?: 'left' | 'right';
    targetHandle?: 'left' | 'right';
    color?: string;
    type?: 'curve' | 'straight' | 'step';
    strokeWidth?: number;
}

export interface Drawing {
    id: string;
    points: { x: number; y: number }[];
    color: string;
    strokeWidth: number;
}

// Helper to calculate diff between states and sync to DB
const syncDiff = async (
    oldState: { notes: Note[], connections: Connection[], drawings: Drawing[] }, 
    newState: { notes: Note[], connections: Connection[], drawings: Drawing[] }, 
    boardId: string | null
) => {
    if (!boardId) return;

    // 1. Calculate Note Diffs
    const oldNotesMap = new Map(oldState.notes.map(n => [n.id, n]));
    const newNotesMap = new Map(newState.notes.map(n => [n.id, n]));

    // Created or Updated
    for (const note of newState.notes) {
        const oldNote = oldNotesMap.get(note.id);
        if (!oldNote) {
            // Created (Restored)
            await supabase.from('notes').insert({ ...note, board_id: boardId });
        } else if (JSON.stringify(oldNote) !== JSON.stringify(note)) {
            // Updated
            await supabase.from('notes').update({ ...note }).eq('id', note.id);
        }
    }
    // Deleted
    for (const note of oldState.notes) {
        if (!newNotesMap.has(note.id)) {
            await supabase.from('notes').delete().eq('id', note.id);
        }
    }
    
    // 2. Diff Connections (Simple ID check)
    const oldConnMap = new Map(oldState.connections.map(c => [c.id, c]));
    const newConnMap = new Map(newState.connections.map(c => [c.id, c]));
    
    for (const conn of newState.connections) {
         if (!oldConnMap.has(conn.id)) {
             await supabase.from('connections').insert({ 
                 id: conn.id, 
                 board_id: boardId,
                 from_id: conn.fromId,
                 to_id: conn.toId,
                 source_handle: conn.sourceHandle,
                 target_handle: conn.targetHandle,
                 type: conn.type,
                 color: conn.color,
                 stroke_width: conn.strokeWidth
             });
         }
    }
    for (const conn of oldState.connections) {
        if (!newConnMap.has(conn.id)) {
            await supabase.from('connections').delete().eq('id', conn.id);
        }
    }

    // 3. Diff Drawings
    const oldDrawMap = new Map(oldState.drawings.map(d => [d.id, d]));
    const newDrawMap = new Map(newState.drawings.map(d => [d.id, d]));

    for (const draw of newState.drawings) {
        if (!oldDrawMap.has(draw.id)) {
             await supabase.from('drawings').insert({
                 id: draw.id,
                 board_id: boardId,
                 points: draw.points,
                 color: draw.color,
                 stroke_width: draw.strokeWidth
             });
        }
    }
    for (const draw of oldState.drawings) {
        if (!newDrawMap.has(draw.id)) {
            await supabase.from('drawings').delete().eq('id', draw.id);
        }
    }
};

interface ViewState {
  x: number;
  y: number;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

interface CanvasStore {
  status: 'connected' | 'connecting' | 'disconnected' | 'saving';
  error: string | null;
  setStatus: (status: 'connected' | 'connecting' | 'disconnected' | 'saving') => void;
  setError: (error: string | null) => void;

  boardId: string | null;
  notes: Note[];
  connections: Connection[];
  view: ViewState;
  
  activeCategory: string | null;
  searchQuery: string;
  categories: { name: string; color: string }[];

  interactionMode: 'select' | 'pan' | 'draw' | 'text' | 'connect' | 'eraser';
  selectedNoteIds: string[];
  selectedConnectionId: string | null;
  history: {
      past: string[]; // JSON snapshots
      future: string[];
  };
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  
  savedBoards: Record<string, {
      id: string;
      title: string;
      notes: Note[];
      connections: Connection[];
      view: ViewState;
      lastModified: number;
  }>;
  deleteBoard: (id: string) => void;
  saveBoard: (id: string, title: string) => void;
  loadBoard: (id: string) => void;
  createBoard: (title?: string) => Promise<string | null>;
  resetCanvas: () => void;

  currentUser: { name: string; email: string } | null;
  login: (email: string) => void;
  logout: () => void;

  setInteractionMode: (mode: 'select' | 'pan' | 'draw' | 'text' | 'connect' | 'eraser') => void;
  selectNote: (id: string, multi?: boolean) => void;
  
  selectConnection: (id: string | null) => void;
  deleteConnection: (id: string) => void;
  
  addConnection: (fromId: string, toId: string, sourceHandle?: 'left' | 'right', targetHandle?: 'left' | 'right') => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  disconnectNote: (noteId: string) => void;
  
  deselectAll: () => void;  
  setSearchQuery: (query: string) => void;
  addCategory: (name: string, color: string) => void;
  updateCategoryColor: (name: string, color: string) => void;
  removeCategory: (name: string) => void;
  setActiveCategory: (name: string | null) => void;
  
  addNote: (note: Omit<Note, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  moveNotes: (dx: number, dy: number) => void;
  moveNote: (id: string, x: number, y: number) => void;
  deleteSelectedNotes: () => void;
  updateSelectedNotesColor: (color: Note['color']) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Drawing Logic
  drawings: Drawing[];
  addDrawing: (drawing: Drawing) => void;
  deleteDrawing: (id: string) => void;

  setViewState: (view: Partial<ViewState>) => void;
  pan: (dx: number, dy: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  subscribeToBoard: (boardId: string) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
      boardId: null,
      notes: [],
      connections: [],
      view: { x: 0, y: 0, zoom: 1, showGrid: true, snapToGrid: false },
      interactionMode: 'select',
      selectedNoteIds: [],
      selectedConnectionId: null,
      history: { past: [], future: [] },
      savedBoards: {},
      currentUser: null,
      
      status: 'connected',
      error: null,
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      
      searchQuery: '',
      activeCategory: null,
      categories: [
          { name: 'Strategy', color: '#3b82f6' }, 
          { name: 'Ideas', color: '#22c55e' },    
          { name: 'Research', color: '#eab308' }  
      ],
      drawings: [],

      
      login: (email) => {
          const name = email.split('@')[0];
          const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
          set({ currentUser: { name: formattedName, email } });
      },
      
      logout: () => set({ currentUser: null }),
      
      setInteractionMode: (mode) => set({ interactionMode: mode }),

      selectNote: (id, multi) => set((state) => ({
        selectedNoteIds: multi 
          ? (state.selectedNoteIds.includes(id) 
              ? state.selectedNoteIds.filter(nid => nid !== id) 
              : [...state.selectedNoteIds, id])
          : [id]
      })),
      
      selectConnection: (id) => set({ selectedConnectionId: id, selectedNoteIds: [] }),
      
      updateConnection: (id, updates) => {
          get().pushHistory();
          set((state) => ({
            connections: state.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          }));
      },

      deleteNote: async (id) => {
          get().pushHistory();
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id)
          }));
          
          const { boardId } = get();
          if (boardId) {
              await supabase.from('notes').delete().eq('id', id);
          }
      },
      
      addConnection: async (fromId, toId, sourceHandle, targetHandle) => {
          const state = get();
          if (fromId === toId) return; 
          const exists = state.connections.some(c => 
             (c.fromId === fromId && c.toId === toId && c.sourceHandle === sourceHandle && c.targetHandle === targetHandle)
          );
          if (exists) return;
          
          const newConnection = { id: crypto.randomUUID(), fromId, toId, sourceHandle, targetHandle };
          
          get().pushHistory();
          set((state) => ({
             connections: [...state.connections, newConnection]
          }));
          
          const { boardId } = get();
          if (boardId) {
              await supabase.from('connections').insert({
                  id: newConnection.id,
                  board_id: boardId,
                  from_id: fromId,
                  to_id: toId,
                  source_handle: sourceHandle,
                  target_handle: targetHandle,
                  type: 'curve' 
              });
          }
      },

      deleteConnection: async (id) => {
          get().pushHistory();
          set((state) => ({
              connections: state.connections.filter(c => c.id !== id),
              selectedConnectionId: null
          }));
          
          const { boardId } = get();
          if (boardId) {
              await supabase.from('connections').delete().eq('id', id);
          }
      },

      disconnectNote: (noteId) => {
          get().pushHistory();
          set((state) => ({
              connections: state.connections.filter(c => c.fromId !== noteId && c.toId !== noteId)
          }));
      },
      
      deselectAll: () => set({ selectedNoteIds: [] }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),


      addCategory: (name, color) => set((state) => ({
          categories: state.categories.some(c => c.name === name) 
            ? state.categories 
            : [...state.categories, { name, color }]
      })),
      
      updateCategoryColor: (name, color) => set((state) => ({
          categories: state.categories.map(c => c.name === name ? { ...c, color } : c)
      })),
      
      removeCategory: (name) => set((state) => ({
          categories: state.categories.filter(c => c.name !== name)
      })),
      
      setActiveCategory: (category) => set((state) => ({
          activeCategory: state.activeCategory === category ? null : category
      })),


      addNote: async (note) => {
        const id = crypto.randomUUID();
        const noteWithId = { ...note, id };
        
        get().pushHistory();
        set((state) => ({
            notes: [...state.notes, noteWithId]
        }));
        
        const { boardId } = get();
        if (boardId) {
            await supabase.from('notes').insert({
                id: noteWithId.id,
                board_id: boardId,
                x: noteWithId.x,
                y: noteWithId.y,
                title: noteWithId.title || '',
                content: noteWithId.content,
                type: noteWithId.type,
                color: noteWithId.color,
                tags: noteWithId.tags || [],
                image_url: noteWithId.imageUrl || null,
                width: noteWithId.width || 200, // Default width?
                height: noteWithId.height || 200 
            });
        }
      },

      updateNote: async (id, updates) => {
        // get().pushHistory(); // Debounce history in future?
        set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n))
        }));
        
        const { boardId } = get();
        if (boardId) {
             // Map frontend keys to DB snake_case if needed, or just specific fields
             const dbUpdates: any = {};
             if (updates.x !== undefined) dbUpdates.x = updates.x;
             if (updates.y !== undefined) dbUpdates.y = updates.y;
             if (updates.content !== undefined) dbUpdates.content = updates.content;
             if (updates.title !== undefined) dbUpdates.title = updates.title;
             if (updates.color !== undefined) dbUpdates.color = updates.color;
             if (updates.width !== undefined) dbUpdates.width = updates.width;
             if (updates.height !== undefined) dbUpdates.height = updates.height;
             
             if (Object.keys(dbUpdates).length > 0) {
                 await supabase.from('notes').update(dbUpdates).eq('id', id);
             }
        }
      },

      addDrawing: async (drawing) => {
          get().pushHistory();
          set((state) => ({
              drawings: [...state.drawings, drawing]
          }));
          
          const { boardId } = get();
          if (boardId) {
              // Convert points to JSON or appropriate format if needed
              // Schema has points as jsonb?
              await supabase.from('drawings').insert({
                  id: drawing.id,
                  board_id: boardId,
                  points: drawing.points,
                  color: drawing.color,
                  stroke_width: drawing.strokeWidth
              });
          }
      },

      deleteDrawing: async (id) => {
          get().pushHistory();
          set((state) => ({
              drawings: state.drawings.filter(d => d.id !== id)
          }));
          
          const { boardId } = get();
          if (boardId) {
              await supabase.from('drawings').delete().eq('id', id);
          }
      },



      moveNotes: (dx, dy) => {
          get().pushHistory();
          set((state) => {
              const notesToMove = state.selectedNoteIds.length > 0 
                  ? state.selectedNoteIds 
                  : []; 
              
              if(notesToMove.length === 0) return {};
              
              const snap = state.view.snapToGrid;
              const SNAP = 24;

              return {
                notes: state.notes.map((n) => {
                    if (notesToMove.includes(n.id)) {
                        let finalX = n.x + dx;
                        let finalY = n.y + dy;
                        
                        if (snap) {
                            finalX = Math.round(finalX / SNAP) * SNAP;
                            finalY = Math.round(finalY / SNAP) * SNAP;
                        }
                        return { ...n, x: finalX, y: finalY };
                    }
                    return n;
                })
              };
          });
      },

      moveNote: async (id, x, y) => {
        get().pushHistory();
        let finalX = x;
        let finalY = y;
        const snap = get().view.snapToGrid;
        
        if (snap) {
            const SNAP = 24;
            finalX = Math.round(finalX / SNAP) * SNAP;
            finalY = Math.round(finalY / SNAP) * SNAP;
        }

        set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? { ...n, x: finalX, y: finalY } : n))
        }));
        
        const { boardId } = get();
        if (boardId) {
             await supabase.from('notes').update({ x: finalX, y: finalY }).eq('id', id);
        }
      },

      deleteSelectedNotes: () => {
          get().pushHistory();
          set((state) => ({
              notes: state.notes.filter(n => !state.selectedNoteIds.includes(n.id)),
              selectedNoteIds: [], // Clear selection after delete
              // Also remove connections attached to deleted notes
              connections: state.connections.filter(c => 
                  !state.selectedNoteIds.includes(c.fromId) && !state.selectedNoteIds.includes(c.toId)
              )
          }));
      },

      updateSelectedNotesColor: (color) => {
          get().pushHistory();
          set((state) => ({
              notes: state.notes.map(n => 
                  state.selectedNoteIds.includes(n.id) ? { ...n, color } : n
              )
          }));
      },

      bringToFront: (id) => {
          const { notes } = get();
          const noteIndex = notes.findIndex(n => n.id === id);
          if (noteIndex === -1 || noteIndex === notes.length - 1) return;
          
          const note = notes[noteIndex];
          const newNotes = [...notes];
          newNotes.splice(noteIndex, 1);
          newNotes.push(note);
          
          set({ notes: newNotes });
          get().pushHistory();
      },

      sendToBack: (id) => {
          const { notes } = get();
          const noteIndex = notes.findIndex(n => n.id === id);
          if (noteIndex === -1 || noteIndex === 0) return;
          
          const note = notes[noteIndex];
          const newNotes = [...notes];
          newNotes.splice(noteIndex, 1);
          newNotes.unshift(note);
          
          set({ notes: newNotes });
          get().pushHistory();
      },

      setViewState: (updates) => set((state) => ({
        view: { ...state.view, ...updates }
      })),

      pan: (dx, dy) => set((state) => ({
        view: { ...state.view, x: state.view.x + dx, y: state.view.y + dy }
      })),

      zoomIn: () => set((state) => ({
        view: { ...state.view, zoom: Math.min(state.view.zoom * 1.1, 3) }
      })),

      zoomOut: () => set((state) => ({
        view: { ...state.view, zoom: Math.max(state.view.zoom / 1.1, 0.1) }
        })),
        
      // History Logic
      pushHistory: () => {
          const state = get();
          const snapshot = JSON.stringify({ 
              notes: state.notes, 
              connections: state.connections,
              drawings: state.drawings 
          });
          const newPast = [...state.history.past, snapshot].slice(-20); // Keep last 20
          set({
              history: {
                  past: newPast,
                  future: []
              }
          });
      },

      deleteBoard: (id) => set((state) => {
          const { [id]: deleted, ...rest } = state.savedBoards;
          return { savedBoards: rest };
      }),

      saveBoard: async (id, title) => {
          // Optimistic local update
           set((state) => ({
              savedBoards: {
                  ...state.savedBoards,
                  [id]: { 
                    id, 
                    title, 
                    notes: state.notes, 
                    connections: state.connections, 
                    view: state.view, 
                    lastModified: Date.now() 
                  }
              }
           }));
           
           // Supabase Sync
           const { data: { user } } = await supabase.auth.getUser();
           if (!user) return;

           // Upsert board metadata
           const { error: boardError } = await supabase
            .from('boards')
            .upsert({ 
                id, 
                owner_id: user.id, 
                title, 
                view_state: get().view,
                last_modified: new Date().toISOString()
            });

           if (boardError) console.error("Error saving board meta:", boardError);
           // Logic for saving contents would go here, usually handled by individual atomic updates
           // But for a full "Save" button, we might want to sync everything?
           // Actually, let's keep it simple: "Save" just creates/updates the board entry.
           // Content updates happen atomically.
      },

      createBoard: async (title: string = 'My First Board') => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;
          
          const id = crypto.randomUUID();
          
          await supabase.from('boards').insert({
              id,
              owner_id: user.id,
              title,
              view_state: { x: 0, y: 0, zoom: 1, showGrid: true, snapToGrid: false },
              last_modified: new Date().toISOString()
          });
          
          // Switch to this board
          get().loadBoard(id);
          return id;
      },
      
      loadBoard: async (id) => {
          set({ boardId: id });
          
          const { data: board, error } = await supabase
            .from('boards')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error || !board) {
              console.error("Error loading board:", error);
              return;
          }

          if (board.view_state) {
              set({ view: board.view_state });
          }
          
          // Fetch contents
          const [notesRes, connsRes, drawsRes] = await Promise.all([
            supabase.from('notes').select('*').eq('board_id', id),
            supabase.from('connections').select('*').eq('board_id', id),
            supabase.from('drawings').select('*').eq('board_id', id)
          ]);

          if (notesRes.data) set({ notes: notesRes.data });
          if (connsRes.data) set({ connections: connsRes.data.map((c: any) => ({
              id: c.id, 
              fromId: c.from_id, 
              toId: c.to_id, 
              sourceHandle: c.source_handle, 
              targetHandle: c.target_handle,
              type: c.type,
              color: c.color,
              strokeWidth: c.stroke_width
          })) });
          if (drawsRes.data) set({ drawings: drawsRes.data });
          
          // Start Realtime Subscription
          get().subscribeToBoard(id);
      },
      
      subscribeToBoard: (boardId) => {
          supabase.channel(`board:${boardId}`)
            .on(
                'postgres_changes', 
                { event: '*', schema: 'public', table: 'notes', filter: `board_id=eq.${boardId}` },
                (payload) => {
                    console.log('RT: Note Change', payload); // DEBUG
                    const { eventType, new: newRecord, old: oldRecord } = payload;
                    set((state) => {
                        if (eventType === 'INSERT') {
                            if (state.notes.some(n => n.id === newRecord.id)) return {}; // Prevent echo
                            return { notes: [...state.notes, newRecord as Note] };
                        }
                        if (eventType === 'UPDATE') {
                           return { 
                               notes: state.notes.map(n => n.id === newRecord.id ? { ...n, ...newRecord } : n) 
                           };
                        }
                        if (eventType === 'DELETE') {
                            return { notes: state.notes.filter(n => n.id !== oldRecord.id) };
                        }
                        return {};
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'connections', filter: `board_id=eq.${boardId}` },
                (payload) => {
                     const { eventType, new: newRecord, old: oldRecord } = payload;
                     set((state) => {
                        if (eventType === 'INSERT') {
                             // Map DB snake_case to camelCase
                             const conn = {
                                 id: newRecord.id,
                                 fromId: newRecord.from_id,
                                 toId: newRecord.to_id,
                                 sourceHandle: newRecord.source_handle,
                                 targetHandle: newRecord.target_handle,
                                 type: newRecord.type,
                                 color: newRecord.color,
                                 strokeWidth: newRecord.stroke_width
                             };
                             if (state.connections.some(c => c.id === conn.id)) return {};
                             return { connections: [...state.connections, conn] };
                        }
                        if (eventType === 'DELETE') {
                            return { connections: state.connections.filter(c => c.id !== oldRecord.id) };
                        }
                        return {};
                     });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'drawings', filter: `board_id=eq.${boardId}` },
                (payload) => {
                     const { eventType, new: newRecord, old: oldRecord } = payload;
                     set((state) => {
                        if (eventType === 'INSERT') {
                             if (state.drawings.some(d => d.id === newRecord.id)) return {};
                             return { drawings: [...state.drawings, newRecord as Drawing] };
                        }
                        if (eventType === 'DELETE') {
                            return { drawings: state.drawings.filter(d => d.id !== oldRecord.id) };
                        }
                        return {};
                     });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    set({ status: 'connected' });
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    set({ status: 'disconnected' });
                }
            });
      },

      fetchBoardsList: async () => { 
          // New Helper to get list for dashboard
           const { data: boards } = await supabase.from('boards').select('id, title, last_modified');
           if (boards) {
               // Map to savedBoards format roughly or just store logic
               // For now keeping savedBoards as cache
               const boardMap: any = {};
               boards.forEach(b => {
                   boardMap[b.id] = { id: b.id, title: b.title, lastModified: new Date(b.last_modified).getTime() };
               });
               set({ savedBoards: boardMap });
           }
      },

      resetCanvas: () => {
          get().pushHistory();
          set({
              notes: [],
              connections: [],
              view: { x: 0, y: 0, zoom: 1, showGrid: true, snapToGrid: false },
              selectedNoteIds: []
          });
      },
      
      undo: async () => {
          const state = get();
          if (state.history.past.length === 0) return;
          const previous = state.history.past[state.history.past.length - 1];
          const newPast = state.history.past.slice(0, -1);
          
          const currentSnapshot = JSON.stringify({ 
              notes: state.notes, 
              connections: state.connections, 
              drawings: state.drawings 
          });

          // Capture OLD state (Current on screen)
          const stateBeforeUndo = { 
              notes: state.notes, 
              connections: state.connections, 
              drawings: state.drawings 
          };
          
          const { notes, connections, drawings } = JSON.parse(previous);

          // Restore Visuals Immediately
          set({
              notes,
              connections,
              drawings: drawings || [], 
              history: {
                  past: newPast,
                  future: [currentSnapshot, ...state.history.future]
              }
          });

          // Sync Differences to DB
          await syncDiff(
              stateBeforeUndo, 
              { notes, connections, drawings: drawings || [] }, 
              state.boardId
          );
      },
      
      redo: async () => {
          const state = get();
          if (state.history.future.length === 0) return;
          const next = state.history.future[0];
          const newFuture = state.history.future.slice(1);
          
          const currentSnapshot = JSON.stringify({ 
              notes: state.notes, 
              connections: state.connections, 
              drawings: state.drawings 
          });

          const stateBeforeRedo = { 
              notes: state.notes, 
              connections: state.connections, 
              drawings: state.drawings 
          };

          const { notes, connections, drawings } = JSON.parse(next);
          
          set({
              notes,
              connections,
              drawings: drawings || [],
              history: {
                  past: [...state.history.past, currentSnapshot],
                  future: newFuture
              }
          });

          // Sync Differences to DB
          await syncDiff(
              stateBeforeRedo, 
              { notes, connections, drawings: drawings || [] }, 
              state.boardId
          );
      },
    })
);
