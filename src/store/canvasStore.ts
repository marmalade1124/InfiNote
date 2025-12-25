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
  // pushHistory removed (duplicate)
  
  // Cleanup: Replaced complex savedBoards object with simple array for dashboard
  savedBoards: { id: string; title: string; lastModified: number; isPublic: boolean }[];
  
  deleteBoard: (id: string) => Promise<void>;
  saveBoard: (id: string, title: string) => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (title?: string) => Promise<string | null>;
  resetCanvas: () => void;
  
  // Sharing
  togglePublic: (id: string, isPublic: boolean) => Promise<void>;
  isReadOnly: boolean;
  activeBoardIsPublic: boolean;

  currentUser: { name: string; email: string; id: string } | null;
  login: (email: string) => void;
  logout: () => void;
  
  // Interaction
  setInteractionMode: (mode: 'select' | 'pan' | 'draw' | 'text' | 'connect' | 'eraser') => void;
  selectNote: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  deleteSelectedNotes: () => void;
  updateSelectedNotesColor: (color: Note['color']) => void;
  setSearchQuery: (query: string) => void;
  setViewState: (view: Partial<ViewState>) => void;
  
  // Viewport
  pan: (dx: number, dy: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  
  // Notes
  addNote: (note: Omit<Note, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  moveNote: (id: string, x: number, y: number) => void;
  moveNotes: (ids: string[], dx: number, dy: number) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  disconnectNote: (id: string) => void;

  // Connections
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;

  // Categories
  addCategory: (name: string, color: string) => void;
  setActiveCategory: (name: string | null) => void;
  removeCategory: (name: string) => void;
  updateCategoryColor: (name: string, color: string) => void;
  
  // Realtime & Drawings
  drawings: Drawing[];
  addDrawing: (drawing: Drawing) => void;
  deleteDrawing: (id: string) => void;
  subscribeToBoard: (boardId: string) => void;
  pushHistory: () => void;
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
      savedBoards: [], 
      currentUser: null,
      isReadOnly: false,
      activeBoardIsPublic: false,
      
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

      setSearchQuery: (query) => set({ searchQuery: query }),
      setViewState: (view) => set((state) => ({ view: { ...state.view, ...view } })),

      pan: (dx, dy) => set((state) => ({ view: { ...state.view, x: state.view.x + dx, y: state.view.y + dy } })),
      zoomIn: () => set((state) => ({ view: { ...state.view, zoom: Math.min(state.view.zoom * 1.2, 5) } })),
      zoomOut: () => set((state) => ({ view: { ...state.view, zoom: Math.max(state.view.zoom / 1.2, 0.1) } })),

      addConnection: async (connection) => {
          const state = get();
          get().pushHistory();
          set({ connections: [...state.connections, connection] });
          if (state.boardId) {
              await supabase.from('connections').insert({
                  id: connection.id,
                  board_id: state.boardId,
                  from_id: connection.fromId,
                  to_id: connection.toId,
                  source_handle: connection.sourceHandle,
                  target_handle: connection.targetHandle,
                  type: connection.type,
                  color: connection.color,
                  stroke_width: connection.strokeWidth
              });
          }
      },
      
      updateConnection: async (id, updates) => {
          const state = get();
          set({ connections: state.connections.map(c => c.id === id ? { ...c, ...updates } : c) });
          if (state.boardId) {
              await supabase.from('connections').update({ 
                  color: updates.color, 
                  type: updates.type, 
                  stroke_width: updates.strokeWidth 
              }).eq('id', id);
          }
      },

      deleteConnection: async (id) => {
          const state = get();
          get().pushHistory();
          set({ connections: state.connections.filter((c) => c.id !== id) });
          if (state.boardId) {
              await supabase.from('connections').delete().eq('id', id);
          }
      },

      selectConnection: (id) => set({ selectedConnectionId: id, selectedNoteIds: [] }),

      addDrawing: async (drawing) => {
          const state = get();
          get().pushHistory(); 
          set({ drawings: [...state.drawings, drawing] });
          if (state.boardId) {
               await supabase.from('drawings').insert({
                   id: drawing.id,
                   board_id: state.boardId,
                   points: drawing.points,
                   color: drawing.color,
                   stroke_width: drawing.strokeWidth
               });
          }
      },
      
      deleteDrawing: async (id) => {
          const state = get();
          get().pushHistory();
          set({ drawings: state.drawings.filter(d => d.id !== id) });
          if (state.boardId) {
              await supabase.from('drawings').delete().eq('id', id);
          }
      },

      setInteractionMode: (mode) => set({ interactionMode: mode }),
      
      selectNote: (id, multi = false) => {
          if (multi) {
              set((state) => ({ 
                  selectedNoteIds: state.selectedNoteIds.includes(id) 
                      ? state.selectedNoteIds.filter(nid => nid !== id)
                      : [...state.selectedNoteIds, id]
              }));
          } else {
              set({ selectedNoteIds: [id] });
          }
      },
      
      deselectAll: () => set({ selectedNoteIds: [], selectedConnectionId: null }),
      
      deleteSelectedNotes: async () => {
          const state = get();
          get().pushHistory();
          
          const idsToDelete = state.selectedNoteIds;
          if (idsToDelete.length === 0) return;

          // Optimistic UI update
          set({ 
              notes: state.notes.filter(n => !idsToDelete.includes(n.id)),
              connections: state.connections.filter(c => !idsToDelete.includes(c.fromId) && !idsToDelete.includes(c.toId)),
              selectedNoteIds: []
          });

          // DB Sync
          if (state.boardId) {
             const { error } = await supabase.from('notes').delete().in('id', idsToDelete);
             if (error) console.error("Error deleting notes:", error);
          }
      },
      
      updateSelectedNotesColor: async (color) => {
          const state = get();
          get().pushHistory();
          
          const ids = state.selectedNoteIds;
          set({
              notes: state.notes.map(n => ids.includes(n.id) ? { ...n, color } : n)
          });
          
          if (state.boardId) {
              await supabase.from('notes').update({ color }).in('id', ids);
          }
      },

      addNote: async (noteData) => {
          const state = get();
          get().pushHistory();
          
          const newNote: Note = {
              id: crypto.randomUUID(),
              ...noteData
          };
          
          set({ notes: [...state.notes, newNote] });
          
          if (state.boardId) {
              await supabase.from('notes').insert({ ...newNote, board_id: state.boardId });
          }
      },

      updateNote: async (id, updates) => {
          // No history push for every keystroke/drag, usually debounced or onEnd
          set((state) => ({
              notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n)
          }));
          
          const state = get();
          if (state.boardId) {
             // For frequent updates, we might want to debounce this or rely on a "save" trigger
             // But for now, direct update is fine if calls are not too frequent
             await supabase.from('notes').update(updates).eq('id', id);
          }
      },
      
      moveNote: async (id, x, y) => {
          set((state) => ({
              notes: state.notes.map(n => n.id === id ? { ...n, x, y } : n)
          }));
          const state = get();
          if (state.boardId) {
              await supabase.from('notes').update({ x, y }).eq('id', id);
          }
      },
      
      moveNotes: async (ids, dx, dy) => {
           set((state) => ({
                notes: state.notes.map(n => ids.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)
           }));
           // Debouncing suggested for real app
           const state = get();
           if (state.boardId) {
               for (const id of ids) {
                   const note = state.notes.find(n => n.id === id);
                   if (note) {
                       await supabase.from('notes').update({ x: note.x, y: note.y }).eq('id', id);
                   }
               }
           }
      },

      deleteNote: async (id) => {
          const state = get();
          get().pushHistory();
          
          set({ 
              notes: state.notes.filter(n => n.id !== id),
              connections: state.connections.filter(c => c.fromId !== id && c.toId !== id)
          });
          
          if (state.boardId) {
              await supabase.from('notes').delete().eq('id', id);
          }
      },
      
      duplicateNote: async (id) => {
          const state = get();
          const noteToDuplicate = state.notes.find(n => n.id === id);
          if (!noteToDuplicate) return;
          
          get().pushHistory();
          
          const newNote = {
              ...noteToDuplicate,
              id: crypto.randomUUID(),
              x: noteToDuplicate.x + 20,
              y: noteToDuplicate.y + 20,
              title: `${noteToDuplicate.title} (Copy)`
          };
          
          set({ notes: [...state.notes, newNote] });
          
          if (state.boardId) {
              await supabase.from('notes').insert({ ...newNote, board_id: state.boardId });
          }
      },

      bringToFront: (id) => {
           set(state => {
               const index = state.notes.findIndex(n => n.id === id);
               if (index === -1 || index === state.notes.length - 1) return state;
               const newNotes = [...state.notes];
               const [note] = newNotes.splice(index, 1);
               newNotes.push(note);
               return { notes: newNotes };
           });
      },

      sendToBack: (id) => {
          set(state => {
               const index = state.notes.findIndex(n => n.id === id);
               if (index === -1 || index === 0) return state;
               const newNotes = [...state.notes];
               const [note] = newNotes.splice(index, 1);
               newNotes.unshift(note);
               return { notes: newNotes };
           });
      },
      
      disconnectNote: async (id) => {
           const state = get();
           get().pushHistory();
           set({ 
               connections: state.connections.filter(c => c.fromId !== id && c.toId !== id)
           });
           // DB sync for connections is handled by syncDiff or we should add explicit delete
           // Ideally we should delete specific connections from DB
           if (state.boardId) {
               await supabase.from('connections').delete().or(`from_id.eq.${id},to_id.eq.${id}`);
           }
      },

      addCategory: (name, color) => set(state => ({ categories: [...state.categories, { name, color }] })),
      setActiveCategory: (name) => set({ activeCategory: name }),
      removeCategory: (name) => set(state => ({ categories: state.categories.filter(c => c.name !== name) })),
      updateCategoryColor: (name, color) => set(state => ({ categories: state.categories.map(c => c.name === name ? { ...c, color } : c) })),

      
      login: async (email) => {
          const { data: { user } } = await supabase.auth.getUser();
          const name = email.split('@')[0];
          const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
          // Store ID too for ownership checks
          set({ currentUser: { 
              name: formattedName, 
              email, 
              id: user?.id || '' 
          } });
      },
      
      logout: () => {
          supabase.auth.signOut();
          set({ currentUser: null, savedBoards: [] });
      },
      
      // ... (Actions unchanged, assuming they check isReadOnly via UI disabling or RLS rejection) ...
      // For brevity, I am not re-writing all interaction actions, but ideally they should check isReadOnly.
      // However, RLS will enforce it on the server. The UI should hide tools.
      
      // ... (Skipping to modified functions) ...

      deleteBoard: async (id) => {
           const { error } = await supabase.from('boards').delete().eq('id', id);
           if (!error) {
               set((state) => ({
                   savedBoards: state.savedBoards.filter(b => b.id !== id)
               }));
           }
      },

      saveBoard: async (id, title) => {
           set((state) => ({
               // Optimistic update of title in list
               savedBoards: state.savedBoards.map(b => b.id === id ? { ...b, title, lastModified: Date.now() } : b)
           }));
           
           const { data: { user } } = await supabase.auth.getUser();
           if (!user) return;

           await supabase
            .from('boards')
            .update({ 
                title, 
                view_state: get().view,
                last_modified: new Date().toISOString()
            })
            .eq('id', id);
           // distinct update vs upsert to avoid creating if not exists (createBoard handles creation)
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
              last_modified: new Date().toISOString(),
              is_public: false
          });
          
          get().loadBoard(id);
          return id;
      },
      
      togglePublic: async (id, isPublic) => {
          const { error } = await supabase.from('boards').update({ is_public: isPublic }).eq('id', id);
          if (!error) {
              // Update local list if present
              set(state => ({
                  savedBoards: state.savedBoards.map(b => b.id === id ? { ...b, isPublic } : b),
                  activeBoardIsPublic: state.boardId === id ? isPublic : state.activeBoardIsPublic
              }));
          }
      },
      
      loadBoard: async (id) => {
          set({ boardId: id, status: 'connecting' });
          
          const { data: board, error } = await supabase
            .from('boards')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error || !board) {
              console.error("Error loading board:", error);
              set({ status: 'disconnected', error: 'Board not found' });
              return;
          }
          
          // Check Read Only
          const { data: { user } } = await supabase.auth.getUser();
          const isOwner = user && user.id === board.owner_id;
          set({ 
              isReadOnly: !isOwner,
              activeBoardIsPublic: board.is_public || false
          });

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
          
          set({ status: 'connected' });
          
          // Start Realtime Subscription
          get().subscribeToBoard(id);
      },

      subscribeToBoard: (boardId) => {
          console.log("Subscribing to board:", boardId);
          // Realtime subscription logic
          supabase.channel(`board:${boardId}`)
          .on('postgres_changes', 
              { event: '*', schema: 'public', filter: `board_id=eq.${boardId}`, table: 'notes' },
              (payload) => {
                  console.log('Realtime update:', payload);
                  // In a full implementation, we would merge changes here.
                  // For now, we rely on manual refresh or implemented optimistic updates.
              }
          )
          .subscribe();
      },

      pushHistory: () => {
          const state = get();
          const currentSnapshot = JSON.stringify({
              notes: state.notes,
              connections: state.connections,
              drawings: state.drawings
          });
          
          const newPast = [...state.history.past, currentSnapshot];
          if (newPast.length > 50) newPast.shift();

          set({
              history: {
                  past: newPast,
                  future: []
              }
          });
      },

      fetchBoardsList: async () => { 
           const { data: boards } = await supabase
            .from('boards')
            .select('id, title, last_modified, is_public')
            .order('last_modified', { ascending: false });
            
           if (boards) {
               set({ 
                   savedBoards: boards.map(b => ({
                       id: b.id, 
                       title: b.title, 
                       lastModified: new Date(b.last_modified).getTime(),
                       isPublic: b.is_public
                   }))
               });
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
