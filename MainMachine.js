// MainMachine.js (MODIFIED)
const { createMachine, assign, spawn, sendParent , send } = require('xstate');

const fetchFn = (url, options) =>
  import('node-fetch').then(({ default: fetch }) => fetch(url, options));

const fetchMachine = createMachine({
  id: 'fetchMachine',
  initial: 'Idle',
  context: {
    url: '',
    request: 'POST',
    parameters: {},
    success: '',
    failure: '',
  },
  states: {
    Idle: {
      on: {
        FETCH: {
          target: 'Fetching',
          actions: assign((_, event) => ({
            url: event.value.url,
            request: event.value.request,
            parameters: event.value.parameter,
            success: event.value.success,
            failure: event.value.failure,
          })),
        },
      },
    },
    Fetching: {
      invoke: {
        src: (context) => {
          console.log('🌐 Starting fetch to:', context.url);
          // Add a timeout promise to prevent hanging
          const fetchPromise = fetchFn(context.url, {
            method: context.request,
            headers: { 'Content-Type': 'application/json' },
            body: context.request === 'GET' ? undefined : JSON.stringify(context.parameters),
          }).then(async (response) => {
            console.log('📬 Fetch response received:', response.ok, response.status);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (response.status === 204) return null;
            const data = await response.json();
            console.log('🔁 Parsed JSON:', data);
            // Custom validation checks
            if (data.mBoolean) throw new Error(data.errorMessage);
            if (Array.isArray(data) && data[0]?.validate === false)
              throw new Error(data[0].message);
            if (data.validate === false) throw new Error(data.message);
            return data;
          });

          // Wrap in a timeout
          return Promise.race([
            fetchPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Network timeout')), 10000)
            )
          ]);
        },
        onDone: {
          target: 'Idle',
          actions: sendParent((ctx, event) => {
            console.log('✅ FetchMachine success, sending:', {
              type: ctx.success,
              result: event.data,
            });
            return { type: ctx.success, result: event.data };
          }),
        },
        onError: {
          target: 'Idle',
          actions: sendParent((ctx, event) => {
            console.error('❌ FetchMachine error:', event.data);
            return {
              type: ctx.failure,
              errorMessage: event.data?.message || 'Unknown error',
            };
          }),
        },
      },
    },
  },
});


const loginMachine = createMachine(
  {
    id: 'loginMachine',
    initial: 'Authenticated',
    context: {
      email: '',
      password: '',
      users: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      Authenticated: {
        //entry: 'sendCtx',
        on: {
          LOGIN: {
            target: 'LOGIN_DB',
            actions: assign((_, event) => ({
              email: event.value.email,
              password: event.value.password,
            })),
          },
        },
      },

      LOGIN_DB: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/users/login', // 🔁 Use your actual DB login API
                request: 'POST',
                parameter: {
                  email: context.email,
                  password: context.password,
                },
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'LoggedIn',
            actions: assign({
              users: (_, event) => ({ success: true, user: event.result }),
              //console: (context, event) => console.log('Login Machine(in) Users:', event.result),
            }),
          },
          FETCH_ERROR: {
            target: 'failed',
            actions: assign({
              users: () => ({ success: false, user: null }),
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },

      LoggedIn: {
        type: 'final',
        entry: 'sendCtx', // ✅ Now this sends response from server
      },

      failed: { entry: 'sendCtx', on: { target: 'Authenticated' } },

    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // This will be injected from server.js
        // so nothing to change here
      },
    },
  }
);

// --- SIGNUP MACHINE ---
const signupMachine = createMachine(
  {
    id: 'signupMachine',
    initial: 'Ready',
    context: {
      name: '',
      email: '',
      password: '',
      users: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      Ready: {
        on: {
          SIGNUP: {
            target: 'SIGNUP_DB',
            actions: assign((_, event) => ({
              name: event.value.name,
              email: event.value.email,
              password: event.value.password,
            })),
          },
        },
      },
      SIGNUP_DB: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/users/signup',
                request: 'POST',
                parameter: {
                  name: context.name,
                  email: context.email,
                  password: context.password,
                },
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'SignedUp',
            actions: assign({
              users: (_, event) => ({ success: true, user: event.result }),
            }),
          },
          FETCH_ERROR: {
            target: 'Sfailed',
            actions: assign({
              users: () => ({ success: false, user: null }),
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      SignedUp: {
        type: 'final',
        entry: 'sendCtx',
      },
      Sfailed: { entry: 'sendCtx', on: { target: 'Ready' } },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // This will be injected from server.js
      },
    },
  }
);

//HOME MACHINE
// This machine is used to fetch best products for the home page

const homeMachine = createMachine(
  {
    id: 'homeMachine',
    initial: 'homeReady',
    context: {
      bestProducts: [],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      homeReady: {
        on: {
          GET_BEST_PRODUCTS: 'BestProducts_db',
        },
      },
      BestProducts_db: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/products/best',
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              bestProducts: (_, ev) =>
                Array.isArray(ev.result) ? ev.result : [],
            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              bestProducts: () => [],
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

const foodsMachine = createMachine(
  {
    id: 'foodsMachine',
    initial: 'foodsReady',
    context: {
      Product: [],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      foodsReady: {
        on: {
          GET_PRODUCTS: 'Products_db',
        },
      },
      Products_db: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/products',
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              Product: (_, ev) =>
                Array.isArray(ev.result) ? ev.result : [],
            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              Product: () => [],
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

const productMachine = createMachine(
  {
    id: 'productMachine',
    initial: 'productReady',
    context: {
      id: null,
      Product: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      productReady: {
        on: {
          GET_PRODUCT: {
          target: 'Product_db',
          actions: assign((_, ev) => ({
            id: ev.value.id
          }))
        },
      },
    },
      Product_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧠 Entering Product_db, about to send FETCH event');
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/products/${context.id}`,
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              Product: (_, ev) => ev.result

            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              Product: () => null,
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

const addToBasketMachine = createMachine(
  {
    id: 'addToBasketMachine',
    initial: 'Ready',
    context: {
      user_id: null,
      product_id: null,
      total_booking: 0,
      description : '',
      basket:[],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      Ready: {
        on: {
          ORDER: {
            target: 'ADD_TO_BASKET_DB',
            actions: assign((_, event) => ({
              user_id: event.value.user_id,
              product_id: event.value.product_id,
              total_booking: event.value.total_booking,  
              description: event.value.description || '',
            })),
          },
        },
      },
      ADD_TO_BASKET_DB: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/baskets',
                request: 'POST',
                parameter: {
                  user_id: context.user_id,
                  product_id: context.product_id,
                  total_booking: context.total_booking,
                  description: context.description,
                },
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'AddedToBasket',
            actions: assign({
              basket: (_, event) => ({ success: true, basket: event.result }),
            }),
          },
          FETCH_ERROR: {
            target: 'NotAddedToBasket',
            actions: assign({
              basket: () => ({ success: false, basket: null }),
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      AddedToBasket: {
        type: 'final',
        entry: 'sendCtx',
      },
      NotAddedToBasket: { type: 'final', entry: 'sendCtx', },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // This will be injected from server.js
      },
    },
  }
);

//get basketMachine
const getBasketMachine = createMachine(
  {
    id: 'getBasketMachine',
    initial: 'basketReady',
    context: {
      id: null,
      basket: [],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      basketReady: {
        on: {
          GET_BASKET: {
          target: 'basket_db',
          actions: assign((_, ev) => ({
            id: ev.value.id
          }))
        },
      },
    },
      basket_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧠 Entering basket_db, about to send FETCH event');
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/baskets?user_id=${context.id}`,
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              basket: (_, ev) =>
                Array.isArray(ev.result) ? ev.result : [],

            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              basket: () => [],
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

//Show Basket Machine
const showBasketMachine = createMachine(
  {
    id: 'showBasketMachine',
    initial: 'productReady',
    context: {
      id: null,
      product: [],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      productReady: {
        on: {
          SHOW_BASKET: {
          target: 'product_db',
          actions: assign((_, ev) => ({
            id: ev.value.id
          }))
        },
      },
    },
      product_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧠 Entering product_db, about to send FETCH event');
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/products/${context.id}`,
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              product: (_, ev) => ev.result

            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              product: () => null,
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

// delete Basket Machine
const deleteBasketMachine = createMachine(
  {
    id: 'deleteBasketMachine',
    initial: 'deleteReady',
    context: {
      id: null,
      product: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      deleteReady: {
        on: {
          DELETE_BASKET: {
          target: 'delete_db',
          actions: assign((_, ev) => ({
            id: ev.value.id
          }))
        },
      },
    },
      delete_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧠 Entering delete_db, about to send FETCH event');
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/baskets/${context.id}`,
                request: 'DELETE',        
                parameter: undefined,          
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              product: (_, ev) => ev.result || { success: true }

            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              product: () => null,
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

const orderMachine = createMachine(
  {
    id: 'orderMachine',
    initial: 'Ready',
    context: {
      user_id: null,
      table_no: null,
      items: [],
      errorMessage: '',
      fetchSrc: null,
      order:[]
    },
    states: {
      Ready: {
        on: {
          SET_ORDER: {
            target: 'order_db',
            actions: assign((_, event) => ({
              user_id: event.value.id,
              table_no: event.value.table_no,
              items: event.value.items,
            })),
          },
        },
      },
      order_db: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/orders',
                request: 'POST',
                parameter: {
                  user_id: context.user_id,
                  table_no: context.table_no,
                  items: context.items,
                },
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'OrderPlaced',
            actions: assign({
              order: (_, ev) =>
                Array.isArray(ev.result)
                  ? ev.result
                  : ev.result
                    ? [ev.result]
                    : []
            }),
          },
          FETCH_ERROR: {
            target: 'NotPlaced',
            actions: assign({
              order: () => [],
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      OrderPlaced: {
        type: 'final',
        entry: 'sendCtx',
      },
      NotPlaced: { type: 'final', entry: 'sendCtx', },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // This will be injected from server.js
      },
    },
  }
);

const pendingOrderMachine = createMachine(
  {
    id: 'pendingOrderMachine',
    initial: 'pendingOrderReady',
    context: {
      PendingOrder: [],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      pendingOrderReady: {
        on: {
          GET_PENDING_ORDERS: 'PendingOrders_db',
        },
      },
      PendingOrders_db: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/orders/pending/all',
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              PendingOrder: (_, ev) =>
                Array.isArray(ev.result) ? ev.result : [],
            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              PendingOrder: () => [],
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

// Process Order Machine
const processOrderMachine = createMachine(
  {
    id: 'processOrderMachine',
    initial: 'processReady',
    context: {
      id: null,
      order: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      processReady: {
        on: {
          PROCESS_ORDER: {
          target: 'process_db',
          actions: assign((_, ev) => ({
            id: ev.value.id
          }))
        },
      },
    },
      process_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧠 Entering process_db, about to send FETCH event');
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/orders/process/${context.id}`,
                request: 'DELETE',        
                parameter: undefined,          
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              order: (_, ev) => ev.result || { success: true }

            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              order: () => null,
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

const usersMachine = createMachine(
  {
    id: 'usersMachine',
    initial: 'usersReady',
    context: {
      users: [],
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      usersReady: {
        on: {
          GET_USERS: 'users_db',
        },
      },
      users_db: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/users/all',
                request: 'GET',         // ✅ Switched to GET
                parameter: undefined,          // No body for GET
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              users: (_, ev) =>
                Array.isArray(ev.result) ? ev.result : [],
            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              users: () => [],
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

const deleteProductMachine = createMachine(
  {
    id: 'deleteProductMachine',
    initial: 'deleteReady',
    context: {
      id: null,
      product: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      deleteReady: {
        on: {
          DELETE_PRODUCT: {
          target: 'delete_db',
          actions: assign((_, ev) => ({
            id: ev.value.id
          }))
        },
      },
    },
      delete_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧠 Entering delete_db, about to send FETCH event');
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/products/${context.id}`, // Ensure id is a number
                request: 'DELETE',        
                parameter: undefined,          
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              product: (_, ev) => ev.result || { success: true }

            }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              product: () => null,
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },
      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // overwritten in server.js
      },
    },
  }
);

// Add Product Machine
const addProductMachine = createMachine(
  {
    id: 'addProductMachine',
    initial: 'Ready',
    context: {
      code: '',
      name: '',
      price: 0,
      is_ready: false,
      gambar: '',
      product: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      Ready: {
        on: {
          ADD_PRODUCT: {
            target: 'AddProduct_DB',
            actions: assign((_, event) => ({
              code: event.value.code,
              name: event.value.name,
              price: event.value.price,
              is_ready: event.value.is_ready,
              gambar: event.value.gambar,
            })),
          },
        },
      },
      AddProduct_DB: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: 'http://localhost:3000/products',
                request: 'POST',
                parameter: {
                  code: context.code,
                  name: context.name, 
                  price: context.price,
                  is_ready: context.is_ready,
                  gambar: context.gambar,
                },
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'AddedProduct',
            actions: assign({
              product: (_, event) => ({ success: true, product: event.result }),
            }),
          },
          FETCH_ERROR: {
            target: 'NotAddedProduct',
            actions: assign({
              product: () => ({ success: false, product: null }),
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      AddedProduct: {
        type: 'final',
        entry: 'sendCtx',
      },
      NotAddedProduct: { entry: 'sendCtx', on: { target: 'Ready' } },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // This will be injected from server.js
      },
    },
  }
);

//updateProductMachine
const updateProductMachine = createMachine(
  {
    id: 'updateProductMachine',
    initial: 'Ready',
    context: {
      id: null,
      code: '',
      name: '',
      price: 0,
      is_ready: false,
      gambar: '',
      product: null,
      errorMessage: '',
      fetchSrc: null,
    },
    states: {
      Ready: {
        on: {
          UPDATE_PRODUCT: {
            target: 'updateProduct_DB',
            actions: assign((_, event) => ({
              id: event.value.id,
              code: event.value.code,
              name: event.value.name,
              price: event.value.price,
              is_ready: event.value.is_ready,
              gambar: event.value.gambar,
            })),
          },
        },
      },
      updateProduct_DB: {
        entry: [
          'spawnFetch',
          (context) => {
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/products/${context.id}`, // Ensure id is a number
                request: 'PUT',
                parameter: {
                  code: context.code,
                  name: context.name, 
                  price: context.price,
                  is_ready: context.is_ready,
                  gambar: context.gambar,
                },
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'ProductUpdated',
            actions: assign({
              product: (_, event) => ({ success: true, product: event.result }),
            }),
          },
          FETCH_ERROR: {
            target: 'NotUpdatedProduct',
            actions: assign({
              product: () => ({ success: false, product: null }),
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      ProductUpdated: {
        type: 'final',
        entry: 'sendCtx',
      },
      NotUpdatedProduct: { entry: 'sendCtx', on: { target: 'Ready' } },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // This will be injected from server.js
      },
    },
  }
);

const userPendingOrderMachine = createMachine(
  {
    id: 'userPendingOrderMachine',
    initial: 'pendingOrderReady',
    context: {
      PendingOrder: [],
      errorMessage: '',
      fetchSrc: null,
      user_id: null,
    },
    states: {
      pendingOrderReady: {
        on: {
          GET_USER_PENDING_ORDERS: {
            target: 'assignUserId',
            actions: assign({
              user_id: (_, event) => event.user_id,
            }),
          },
        },
      },

      assignUserId: {
        on: {
          ASSIGNED: 'PendingOrders_db',
        },
        entry: send('ASSIGNED'),
      },

      PendingOrders_db: {
        entry: [
          'spawnFetch',
          (context) => {
            console.log('🧪 FSM Using user_id:', context.user_id); // ✅ Will now log correct user_id
            context.fetchSrc.send({
              type: 'FETCH',
              value: {
                url: `http://localhost:3000/orders/pending/user?user_id=${context.user_id}`,
                request: 'GET',
                parameter: undefined,
                success: 'FETCH_SUCCESS',
                failure: 'FETCH_ERROR',
              },
            });
          },
        ],
        on: {
          FETCH_SUCCESS: {
            target: 'Fetched',
            actions: assign({
              PendingOrder: (_, ev) =>
                Array.isArray(ev.result?.PendingOrder) ? ev.result.PendingOrder : [], }),
          },
          FETCH_ERROR: {
            target: 'notFetched',
            actions: assign({
              PendingOrder: () => [],
              errorMessage: (_, event) => event.errorMessage || event.result?.error || 'Unknown error',
            }),
          },
        },
      },

      Fetched: {
        type: 'final',
        entry: 'sendCtx',
      },

      notFetched: {
        type: 'final',
        entry: 'sendCtx',
      },
    },
  },
  {
    actions: {
      spawnFetch: assign({
        fetchSrc: () => spawn(fetchMachine),
      }),
      sendCtx: (context) => {
        // server.js will overwrite this to send the result
      },
    },
  }
);

module.exports = { loginMachine, signupMachine, homeMachine, foodsMachine, productMachine, addToBasketMachine, getBasketMachine ,showBasketMachine,deleteBasketMachine,orderMachine, pendingOrderMachine, processOrderMachine , usersMachine, deleteProductMachine, addProductMachine, updateProductMachine, userPendingOrderMachine };