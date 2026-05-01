import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Tool, Item } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Image as ImageIcon } from 'lucide-react';

interface CrossSopSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tool' | 'item';
  onClone: (id: string) => Promise<void>;
}

export function CrossSopSearch({ open, onOpenChange, type, onClone }: CrossSopSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Tool | Item)[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isCloning, setIsCloning] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }
  }, [open, query]);

  useEffect(() => {
    loadImages();
  }, [results]);

  const handleSearch = async () => {
    try {
      const command = type === 'tool' ? 'search_tools' : 'search_items';
      const data = await invoke<(Tool | Item)[]>(command, { query });
      setResults(data);
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  const loadImages = async () => {
    const urls: Record<string, string> = {};
    const baseDir = await appDataDir();
    
    for (const res of results) {
      if (res.image_uuid) {
        const filePath = await join(baseDir, 'images', res.image_uuid, 'annotated.png');
        urls[res.image_uuid] = convertFileSrc(filePath);
      }
    }
    setImageUrls(urls);
  };

  const handleCloneClick = async (id: string) => {
    setIsCloning(id);
    try {
      await onClone(id);
    } finally {
      setIsCloning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search other SOPs for {type === 'tool' ? 'Tools' : 'Items'}</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input 
            placeholder="Type to search by name..." 
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 border border-border-standard rounded-md">
          <Table>
            <TableHeader className="bg-secondary sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>{type === 'tool' ? 'Type / Spec' : 'Part # / Unit'}</TableHead>
                <TableHead className="w-[100px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-text-tertiary italic">
                    {query ? 'No results found.' : 'Start typing to search across all SOPs...'}
                  </TableCell>
                </TableRow>
              ) : (
                results.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell>
                      {res.image_uuid && imageUrls[res.image_uuid] ? (
                        <img 
                          src={imageUrls[res.image_uuid]} 
                          alt={res.name} 
                          className="w-[60px] h-[33.75px] object-cover rounded border border-border-subtle"
                        />
                      ) : (
                        <div className="w-[60px] h-[33.75px] bg-background border border-dashed border-border-standard rounded flex items-center justify-center text-text-quaternary">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-text-primary text-sm">{res.name}</TableCell>
                    <TableCell className="text-text-secondary text-xs">
                      {type === 'tool' ? (
                        <>
                          {(res as Tool).type || '—'}
                          <br />
                          <span className="text-text-tertiary">{(res as Tool).specification || ''}</span>
                        </>
                      ) : (
                        <>
                          {(res as Item).part_no || '—'}
                          <br />
                          <span className="text-text-tertiary">{(res as Item).unit || ''}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCloneClick(res.id)}
                        disabled={isCloning !== null}
                      >
                        {isCloning === res.id ? 'Cloning...' : 'Borrow'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
