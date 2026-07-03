import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ShoppingBag, MessageCircle, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SectionTitle from '@/components/common/SectionTitle';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const WHATSAPP_NUMBER = '5567999999999'; // Substituir pelo número real

export default function TeraShop() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ available: true }),
  });

  const categories = ['all', 'Camisetas', 'Canecas', 'Bottons', 'Chaveiros', 'Acessórios'];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const handleWhatsApp = (product = null) => {
    let message = product 
      ? `Olá! Tenho interesse no produto: ${product.name} (R$ ${product.price?.toFixed(2)})`
      : 'Olá! Gostaria de saber mais sobre os produtos da TeraShop.';
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen py-12">
      {/* Hero */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#E10600]/10 border border-[#E10600]/30 rounded-full text-[#E10600] text-sm font-medium mb-6">
              <ShoppingBag className="w-4 h-4" />
              Loja Oficial
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-[#E10600]">Tera</span>Shop
            </h1>
            <p className="text-xl text-[#B8BDC7] mb-8">
              Adquira produtos oficiais da TeraRobotics e apoie nossa equipe! 
              Cada compra ajuda a financiar nossas atividades e competições.
            </p>
            <Button 
              onClick={() => handleWhatsApp()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Entrar em contato pelo WhatsApp
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 lg:top-20 z-40 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-[#1F222B] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="w-4 h-4 text-[#B8BDC7]" />
              <span className="text-sm text-[#B8BDC7]">Categorias:</span>
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="bg-[#111217] border border-[#1F222B]">
                {categories.map((cat) => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="data-[state=active]:bg-[#E10600] whitespace-nowrap"
                  >
                    {cat === 'all' ? 'Todos' : cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <ShoppingBag className="w-16 h-16 text-[#1F222B] mx-auto mb-4" />
              <p className="text-[#B8BDC7]">
                {selectedCategory === 'all' 
                  ? 'Nenhum produto disponível no momento.'
                  : `Nenhum produto na categoria ${selectedCategory}.`}
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden cursor-pointer group hover:border-[#E10600]/50 transition-all"
                >
                  <div className="aspect-square relative overflow-hidden bg-[#0B0B0D]">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-16 h-16 text-[#1F222B]" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 bg-[#111217]/80 backdrop-blur-sm text-xs rounded-full">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-[#E10600] transition-colors">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-[#B8BDC7] text-sm line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-[#E10600]">
                        R$ {product.price?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Product Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProduct.name}</DialogTitle>
                <span className="text-sm text-[#B8BDC7]">{selectedProduct.category}</span>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedProduct.image_url && (
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#0B0B0D]">
                    <img 
                      src={selectedProduct.image_url} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {selectedProduct.description && (
                  <p className="text-[#B8BDC7]">{selectedProduct.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-[#E10600]">
                    R$ {selectedProduct.price?.toFixed(2)}
                  </span>
                </div>

                <Button 
                  onClick={() => handleWhatsApp(selectedProduct)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Comprar pelo WhatsApp
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}