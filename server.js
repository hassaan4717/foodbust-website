const express = require("express");
const cors = require("cors");
const {interpret} = require('xstate');
const {loginMachine,signupMachine, homeMachine, foodsMachine,productMachine,addToBasketMachine,getBasketMachine,showBasketMachine,deleteBasketMachine, orderMachine, pendingOrderMachine, processOrderMachine, usersMachine, deleteProductMachine, addProductMachine, updateProductMachine, userPendingOrderMachine} = require('./MainMachine.js');
// import dashboardMachine from './DashboardMachine.js'; // Uncomment if defined

const app = express();
const port = 4000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: "http://localhost:8080",
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Origin"]
}));

// ✅ Root test route
app.get('/', (req, res) => {
  res.send('✅ Backend FSM server is running!');
});

// 🔒 Login route using FSM
app.post('/login', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = loginMachine.withConfig({
    actions: {
      sendCtx: (context) => {
        const { users } = context;
        console.log('Login Machine Users:', users);
        res.json({
          success: users?.success ?? false,
          //success: users?.success || false,

          user: users?.user,
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('LOGIN STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('Login Machine STOPPED');
    });

  console.log('Received login data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// 🔑 Signup route using FSM
app.post('/signup', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = signupMachine.withConfig({
    actions: {
      sendCtx: (context) => {
        const { users } = context;
        console.log('Signup Machine Users:', users);
        res.json({
          success: users?.success ?? false,
          user: users?.user,
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('SIGNUP STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('Signup Machine STOPPED');
    });

  console.log('Received signup data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

//

app.post('/home', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = homeMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success = ctx.bestProducts.length > 0;
        console.log('Sending /home response:', {
            success: ctx.bestProducts.length > 0,
            products: ctx.bestProducts,
            error: ctx.errorMessage
        });
        res.json({
          success,
          bestProducts: ctx.bestProducts,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('Home Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          bestProducts: [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received HOME(best products) data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// 🔥 Foods route using FSM

app.post('/foods', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = foodsMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success = ctx.Product.length > 0;
        console.log('Sending /foods response:', {
            success: ctx.Product.length > 0,
            product: ctx.Product,
            error: ctx.errorMessage
        });
        res.json({
          success,
          Product: ctx.Product,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('foods Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          Product: [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received FOODS (products) data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// 🔥 Product route using FSM

app.post('/product', (req, res) => {
  const httpReq = req.body;

   if (!httpReq.transition || typeof httpReq.transition !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing or invalid transition type.' });
  }
  if (!httpReq.data || typeof httpReq.data.id === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing product id.' });
  }

  const machineWithSend = productMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        const success = !!ctx.Product;
        console.log('Sending /product response:', {
            success,
            product: ctx.Product
        });
        res.json({
          success,
          Product: ctx.Product,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('PRODUCT fsm STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('product Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          Product: null,
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received product data:', httpReq.data);
  service.start();
  console.log('Sending transition:', httpReq.transition, 'with', httpReq.data);
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// 🔥 Basket route using FSM
app.post('/basket', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = addToBasketMachine.withConfig({
    actions: {
      sendCtx: (context) => {
        const { basket } = context;
        console.log('basket made :', basket);
        res.json({
          success: basket?.success ?? false,
          basket: basket?.basket,
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('Add to basket STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('AddToBasket Machine STOPPED');
    });

  console.log('Received AddToBasket data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// 🔥 Get Basket route using FSM
app.post('/getBasket', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = getBasketMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success = ctx.basket.length > 0;
        console.log('Sending /basket response:', {
            success: ctx.basket.length > 0,
            basket: ctx.basket,
            error: ctx.errorMessage
        });
        res.json({
          success,
          basket: ctx.basket,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('getBasket Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          basket: [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received basket data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

//show Basket route using FSM
app.post('/showBasket', (req, res) => {
  const httpReq = req.body;

   if (!httpReq.transition || typeof httpReq.transition !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing or invalid transition type.' });
  }
  if (!httpReq.data || typeof httpReq.data.id === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing product id.' });
  }

  const machineWithSend = showBasketMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        const success = !!ctx.product;
        console.log('Sending /show basket response:', {
            success,
            product: ctx.product
        });
        res.json({
          success,
          product: ctx.product,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('show Basket fsm STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('showBasket Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          product: null,
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received product data:', httpReq.data);
  service.start();
  console.log('Sending transition:', httpReq.transition, 'with', httpReq.data);
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// 🔥 Delete Basket route using FSM
app.post('/deleteBasket', (req, res) => {
  const httpReq = req.body;

   if (!httpReq.transition || typeof httpReq.transition !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing or invalid transition type.' });
  }
  if (!httpReq.data || typeof httpReq.data.id === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing product id.' });
  }

  const machineWithSend = deleteBasketMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        const success = !!ctx.product;
        console.log('Sending /delete basket response:', {
            success,
            product: ctx.product
        });
        res.json({
          success,
          product: ctx.product,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('delete Basket fsm STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('deleteBasket Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          product: null,
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received product data:', httpReq.data);
  service.start();
  console.log('Sending transition:', httpReq.transition, 'with', httpReq.data);
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// Order route using FSM
app.post('/order', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = orderMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success = ctx.order.length > 0;
        console.log('Sending /order response:', {
            success: ctx.order.length > 0,
            order: ctx.order,
            error: ctx.errorMessage
        });
        res.json({
          success,
          order: ctx.order,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('order Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          order : [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received ordered data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// Pending Orders route using FSM
app.post('/pendingOrder', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = pendingOrderMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success = ctx.PendingOrder.length > 0;
        console.log('Sending /pending order response:', {
            success: ctx.PendingOrder.length > 0,
            PendingOrder: ctx.PendingOrder,
            error: ctx.errorMessage
        });
        res.json({
          success,
          PendingOrder: ctx.PendingOrder,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('pending order Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          PendingOrder: [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received Pending Order data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// Process Order route using FSM
app.post('/processOrder', (req, res) => {
  const httpReq = req.body;

   if (!httpReq.transition || typeof httpReq.transition !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing or invalid transition type.' });
  }
  if (!httpReq.data || typeof httpReq.data.id === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing product id.' });
  }

  const machineWithSend = processOrderMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        const success = !!ctx.order;
        console.log('Sending /process order response:', {
            success,
            order: ctx.order
        });
        res.json({
          success,
          order: ctx.order,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('process order fsm STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('processOrder Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          order: null,
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received order data:', httpReq.data);
  service.start();
  console.log('Sending transition:', httpReq.transition, 'with', httpReq.data);
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// Get Users route using FSM
app.post('/getUsers', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = usersMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success = ctx.users.length > 0;
        console.log('Sending /users response:', {
            success: ctx.users.length > 0,
            users: ctx.users,
            error: ctx.errorMessage
        });
        res.json({
          success,
          users: ctx.users,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('Users Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          users: [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received Users data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

// Delete Product route using FSM
app.post('/deleteProduct', (req, res) => {
  const httpReq = req.body;

   if (!httpReq.transition || typeof httpReq.transition !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing or invalid transition type.' });
  }
  if (!httpReq.data || typeof httpReq.data.id === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing product id.' });
  }

  const machineWithSend = deleteProductMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        const success = !!ctx.product;
        console.log('Sending /delete product response:', {
            success,
            product: ctx.product
        });
        res.json({
          success,
          product: ctx.product,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('delete product fsm STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('delete product Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          product: null,
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received deleting data:', httpReq.data);
  service.start();
  console.log('Sending transition:', httpReq.transition, 'with', httpReq.data);
  service.send({ type: httpReq.transition, value: httpReq.data });
});

app.post('/createProduct', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = addProductMachine.withConfig({
    actions: {
      sendCtx: (context) => {
        const { product } = context;
        console.log('Added Product :', product);
        res.json({
          success: product?.success ?? false,
          product: product?.product,
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('Add to product STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('Add product Machine STOPPED');
    });

  console.log('Received new product data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

app.post('/updateProduct', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = updateProductMachine.withConfig({
    actions: {
      sendCtx: (context) => {
        const { product } = context;
        console.log('Updated Product :', product);
        res.json({
          success: product?.success ?? false,
          product: product?.product,
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onTransition((state) => {
      console.log('update product STATE:', state.value);
      console.log('Next Events:', state.nextEvents);
      console.log('Context:', state.event);
    })
    .onStop(() => {
      console.log('Update product Machine STOPPED');
    });

  console.log('Received update product data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, value: httpReq.data });
});

app.post('/userPendingOrder', (req, res) => {
  const httpReq = req.body;

  const machineWithSend = userPendingOrderMachine.withConfig({
    actions: {
      sendCtx: (ctx) => {
        //const { bestProducts } = context;
        const success =ctx.PendingOrder.length > 0;
        console.log('Sending / user pending order response:', {
            success: ctx.PendingOrder.length > 0,
            PendingOrder: ctx.PendingOrder,
            error: ctx.errorMessage
        });
        res.json({
          success,
          PendingOrder: ctx.PendingOrder,
          error: ctx.errorMessage || null
        });
      },
    },
  });

  const service = interpret(machineWithSend)
    .onStop(() => {
      console.log('user pending order Machine STOPPED');
      if (!res.headersSent) {
        res.json({
          success: false,
          PendingOrder: [],
          error: 'No response from FSM'
        });
      }
    });

  console.log('Received user Pending Order data:', httpReq.data);
  service.start();
  service.send({ type: httpReq.transition, user_id: httpReq.data });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});