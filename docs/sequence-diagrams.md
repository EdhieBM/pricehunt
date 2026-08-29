# Sequence Diagrams - PriceHunt

## 1. Flujo Principal: URL → Compra

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend (Next.js)
    participant API as Backend API
    participant PI as Product Ingestion
    participant PM as Product Matching
    participant PE as Price Engine
    participant DB as PostgreSQL
    participant Cache as Redis
    participant Pay as Conekta
    participant Sup as Supplier

    U->>FE: Pega URL de TikTok
    FE->>API: POST /products/identify {url}
    
    rect rgb(200, 220, 255)
        Note over API,PI: Identificación de Producto
        API->>PI: Identificar producto desde URL
        PI->>PI: Extraer información (título, imagen, precio)
        PI->>DB: Buscar si ya existe producto similar
        alt Producto encontrado
            PI-->>API: Retornar producto existente
        else Producto nuevo
            PI->>DB: Crear nuevo producto
            PI-->>API: Retornar nuevo producto
        end
    end
    
    rect rgb(220, 255, 220)
        Note over API,PM: Product Matching
        API->>PM: Buscar candidatos equivalentes
        PM->>Cache: Verificar cache de matches
        alt Cache hit
            Cache-->>PM: Retornar matches cacheados
        else Cache miss
            PM->>PM: Deterministic matching (GTIN, SKU, MPN)
            PM->>PM: Text matching (embeddings)
            PM->>PM: Image matching (CLIP)
            PM->>DB: Guardar matches
            PM->>Cache: Guardar en cache (TTL: 1h)
        end
        PM-->>API: Lista de candidatos con scores
    end
    
    rect rgb(255, 220, 200)
        Note over API,PE: Price Engine
        loop Para cada candidato
            API->>PE: Calcular precio final
            PE->>PE: Product cost + Shipping + Tax + Fees
            PE->>PE: Aplicar estrategia de pricing
            PE-->>API: Precio calculado con explicación
        end
        API->>API: Ranking de ofertas
        API->>API: Seleccionar mejor oferta
    end
    
    API-->>FE: Producto + Mejor oferta
    FE-->>U: Mostrar precio y opción de compra
    
    U->>FE: Click "Comprar"
    FE->>API: POST /checkout {items, address, email}
    
    rect rgb(255, 255, 200)
        Note over API,Pay: Checkout y Pago
        API->>API: Validar stock (reconfirmar)
        API->>API: Validar precios (tolerancia ±2%)
        API->>DB: Crear orden (status: pending_payment)
        API->>Pay: Autorizar pago
        Pay-->>API: Token de autorización
        API-->>FE: Checkout token + métodos de pago
    end
    
    FE-->>U: Mostrar formulario de pago
    U->>FE: Seleccionar pago (tarjeta/OXXO/SPEI)
    FE->>API: POST /checkout/{token}/confirm {payment}
    
    rect rgb(255, 200, 200)
        Note over API,Sup: Confirmación y Compra
        API->>Pay: Capturar pago
        Pay-->>API: Pago confirmado
        API->>DB: Actualizar orden (status: confirmed)
        API->>Sup: Comprar al proveedor
        alt Proveedor confirma
            Sup-->>API: Orden confirmada + tracking
            API->>DB: Crear supplier_order
            API->>DB: Actualizar orden (status: processing)
            API-->>FE: Orden confirmada
            FE-->>U: "¡Pedido confirmado!"
        else Proveedor falla
            Sup-->>API: Error
            API->>Pay: Reembolsar
            API->>DB: Actualizar orden (status: cancelled)
            API-->>FE: Error + reembolso
            FE-->>U: "Proveedor no disponible, reembolso procesado"
        end
    end
```

## 2. Flujo de Búsqueda

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant API as Backend API
    participant Search as Search Engine
    participant DB as PostgreSQL
    participant Meili as Meilisearch

    U->>FE: Escribe "funda iPhone 15"
    FE->>API: GET /search?q=funda+iPhone+15
    
    alt PostgreSQL (MVP)
        API->>DB: Full-text search + filtros
        DB-->>API: Resultados
    else Meilisearch (Scale)
        API->>Meili: Búsqueda con facets
        Meili-->>API: Resultados con ranking
    end
    
    API->>API: Enriquecer con precios actuales
    API->>API: Filtrar por stock
    API-->>FE: Lista de productos
    FE-->>U: Mostrar resultados
    
    U->>FE: Selecciona un producto
    FE->>API: GET /products/{id}
    API->>DB: Obtener producto + variantes
    API->>DB: Obtener mejores ofertas
    API-->>FE: Detalle completo
    FE-->>U: Página del producto
```

## 3. Flujo de Búsqueda por Imagen

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant API as Backend API
    participant AI as AI Service (CLIP)
    participant DB as PostgreSQL
    participant VectorDB as Vector Store

    U->>FE: Sube imagen de producto
    FE->>API: POST /search/image {image}
    
    rect rgb(200, 220, 255)
        Note over API,AI: Procesamiento de Imagen
        API->>AI: Generar embedding (CLIP)
        AI-->>API: Vector [512 dims]
        API->>VectorDB: Búsqueda por similitud
        VectorDB-->>API: Top 20 candidatos
    end
    
    rect rgb(220, 255, 220)
        Note over API,DB: Verificación
        loop Para cada candidato
            API->>DB: Obtener detalles del producto
            API->>API: Calcular match score final
        end
        API->>API: Filtrar por confianza > 0.7
        API->>API: Ordenar por relevancia
    end
    
    API-->>FE: Productos similares
    FE-->>U: Mostrar resultados con %
```

## 4. Flujo de Order Routing

```mermaid
sequenceDiagram
    participant API as Backend API
    participant Router as Order Router
    participant SupA as Supplier A
    participant SupB as Supplier B
    participant SupC as Supplier C
    participant DB as PostgreSQL
    participant Notify as Notification Service

    API->>Router: Route order (order_id)
    
    rect rgb(255, 220, 200)
        Note over Router: Selección de Proveedor
        Router->>DB: Obtener proveedores disponibles
        Router->>Router: Calcular score por proveedor
        
        loop Intento 1: Supplier A (mejor score)
            Router->>SupA: POST /orders {product, qty, address}
            alt SupA confirma
                SupA-->>Router: order_id + tracking
                Router->>DB: Guardar supplier_order
                Router-->>API: Éxito
            else SupA falla (timeout/error)
                SupA-->>Router: Error
                Router->>Router: Log falla
            end
        end
        
        loop Intento 2: Supplier B (siguiente mejor)
            Router->>SupB: POST /orders {product, qty, address}
            alt SupB confirma
                SupB-->>Router: order_id + tracking
                Router->>DB: Guardar supplier_order
                Router-->>API: Éxito
            else SupB falla
                SupB-->>Router: Error
                Router->>Router: Log falla
            end
        end
        
        loop Intento 3: Supplier C (fallback)
            Router->>SupC: POST /orders {product, qty, address}
            alt SupC confirma
                SupC-->>Router: order_id + tracking
                Router->>DB: Guardar supplier_order
                Router-->>API: Éxito
            else SupC falla
                SupC-->>Router: Error
                Router-->>API: Todos los proveedores fallaron
            end
        end
    end
    
    alt Éxito
        API->>DB: Actualizar orden (processing)
        API->>Notify: Enviar email confirmación
    else Fallo total
        API->>DB: Actualizar orden (cancelled)
        API->>DB: Reembolsar pago
        API->>Notify: Enviar email de reembolso
    end
```

## 5. Flujo de Real-Time Pricing

```mermaid
sequenceDiagram
    participant Scheduler as Cron Scheduler
    participant Queue as BullMQ
    participant Worker as Price Worker
    participant Cache as Redis
    participant Sup as Supplier API
    participant DB as PostgreSQL
    participant Alert as Alert Service

    rect rgb(200, 200, 255)
        Note over Scheduler: Scheduled Job (cada 5-15 min)
        Scheduler->>Queue: Agregar jobs de actualización
        Note right of Queue: 1 job por supplier_product
    end
    
    loop Para cada job
        Queue->>Worker: Procesar actualización
        Worker->>Cache: Verificar si ya se actualizó recientemente
        alt Cache hit (actualizado hace <5 min)
            Cache-->>Worker: Saltar
        else Cache miss
            Worker->>Sup: GET /products/{id}
            Sup-->>Worker: Nuevo precio + stock
            Worker->>DB: Insertar price_event
            Worker->>DB: Actualizar current_price
            Worker->>Cache: Actualizar cache
            
            alt Precio cambió > 5%
                Worker->>Alert: Notificar cambio significativo
                Alert->>Alert: Enviar notificación
            end
        end
    end
```

## 6. Flujo de Tracking

```mermaid
sequenceDiagram
    participant Sup as Supplier
    participant Worker as Tracking Worker
    participant API as Carrier API
    participant DB as PostgreSQL
    participant WS as WebSocket
    participant U as Usuario

    rect rgb(255, 255, 200)
        Note over Sup,Worker: Actualización de Tracking
        Sup->>Worker: Webhook: shipment status changed
        Worker->>API: GET /tracking/{number}
        API-->>Worker: Tracking events
        Worker->>DB: Insertar tracking_events
        Worker->>DB: Actualizar shipment status
    end
    
    rect rgb(200, 255, 200)
        Note over Worker,U: Notificación al Usuario
        Worker->>WS: Emit: tracking_update
        WS->>U: Actualización en tiempo real
    end
    
    alt Entrega completada
        Worker->>DB: Actualizar orden (delivered)
        Worker->>WS: Emit: order_delivered
        WS->>U: "¡Pedido entregado!"
    end
```

## 7. Flujo de Reembolso

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant API as Backend API
    participant Pay as Conekta
    participant Sup as Supplier
    participant DB as PostgreSQL
    participant Notify as Notification Service

    U->>FE: Solicitar reembolso
    FE->>API: POST /orders/{id}/cancel {reason}
    
    rect rgb(255, 220, 200)
        Note over API,DB: Validación
        API->>DB: Obtener orden
        API->>API: Verificar elegibilidad
        alt Orden ya enviada
            API-->>FE: Error: No se puede cancelar
        else Orden pendiente/procesando
            API->>DB: Actualizar orden (cancelling)
        end
    end
    
    rect rgb(255, 200, 200)
        Note over API,Sup: Cancelación con Proveedor
        API->>Sup: DELETE /orders/{supplier_order_id}
        alt Proveedor acepta cancelación
            Sup-->>API: Cancelado + reembolso parcial
            API->>Pay: Reembolsar monto
            Pay-->>API: Reembolso procesado
            API->>DB: Crear refund
            API->>DB: Actualizar orden (cancelled)
            API->>Notify: Enviar email reembolso
            API-->>FE: Reembolso procesado
            FE-->>U: "Reembolso en proceso"
        else Proveedor rechaza
            Sup-->>API: Error
            API->>DB: Marcar para revisión manual
            API-->>FE: Requiere atención manual
        end
    end
```

## 8. Flujo de Admin: Cambiar Pricing Rule

```mermaid
sequenceDiagram
    participant Admin as Administrador
    participant FE as Admin Panel
    participant API as Backend API
    participant PE as Pricing Engine
    participant DB as PostgreSQL
    participant Cache as Redis

    Admin->>FE: Crear/editar regla de pricing
    FE->>API: POST /admin/pricing-rules
    
    rect rgb(200, 220, 255)
        Note over API,PE: Validación
        API->>API: Validar permisos (admin)
        API->>DB: Guardar regla
        API->>Cache: Invalidar cache de pricing
    end
    
    rect rgb(220, 255, 220)
        Note over PE: Recálculo
        PE->>DB: Obtener ofertas activas
        PE->>PE: Re-calcula precios con nueva regla
        PE->>DB: Actualizar ofertas
    end
    
    API-->>FE: Regla guardada
    FE-->>Admin: "Regla actualizada, precios recalculados"
```

## Resumen de Flujos

| # | Flujo | Complejidad | Latencia Objetivo |
|---|-------|-------------|-------------------|
| 1 | URL → Compra | Alta | < 5s (identificación + pricing) |
| 2 | Búsqueda | Media | < 500ms |
| 3 | Búsqueda por imagen | Alta | < 2s |
| 4 | Order routing | Alta | < 30s (con fallbacks) |
| 5 | Real-time pricing | Media | Background (5-15 min) |
| 6 | Tracking | Baja | < 1s (webhook) |
| 7 | Reembolso | Media | < 10s |
| 8 | Admin pricing | Baja | < 2s |
