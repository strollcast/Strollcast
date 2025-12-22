# Pathways: Asynchronous Distributed Dataflow for ML

**ERIC:** Welcome back to Strollcast! I'm Eric.

**MAYA:** And I'm Maya. We're your AI hosts, here to make research accessible while you're on the move.

**ERIC:** Today we're diving into one of Google's most ambitious infrastructure papers—Pathways: Asynchronous Distributed Dataflow for ML, published in 2022.

**MAYA:** This paper is fascinating because it's not about a new model architecture or training algorithm. It's about fundamentally rethinking how we orchestrate computation across thousands of accelerators.

**ERIC:** Exactly. And the author list reads like a who's who of distributed systems—Paul Barham, Jeff Dean, Sanjay Ghemawat. These are the people who built MapReduce, TensorFlow, and countless other systems that power modern computing.

**MAYA:** So what problem is Pathways trying to solve? Haven't we already figured out distributed training with systems like Megatron, DeepSpeed, and PyTorch FSDP?

**ERIC:** Great question. Those systems are excellent at what they do, but they're optimized for a specific pattern—SPMD, or Single Program Multiple Data. You write one program, and it runs the same computation across all your devices.

**MAYA:** Right, that's how most distributed training works today. You shard your model and data across GPUs, and each GPU runs the same operations on different chunks.

**ERIC:** But Google's researchers were looking ahead to a future where we might want something more flexible. What if you want different parts of your system doing completely different things? What if you want one group of TPUs running a vision model while another runs a language model, and they need to communicate?

**MAYA:** Ah, so this is about heterogeneous computation—mixing different types of workloads across a shared infrastructure.

**ERIC:** Exactly. And it's also about making it easier to experiment with new parallelism strategies. With current systems, implementing a new form of parallelism often means rewriting significant portions of your infrastructure.

**MAYA:** Let's set the stage a bit. What does the landscape of ML infrastructure look like, and where does Pathways fit in?

## The Infrastructure Landscape

**ERIC:** So at the time this paper was written, there were roughly two approaches to distributed ML. The first is what I'd call the multi-controller approach.

**MAYA:** Multi-controller—meaning each accelerator or group of accelerators has its own controller making decisions?

**ERIC:** Right. Systems like PyTorch's distributed data parallel work this way. Each process independently figures out what to do, and they coordinate through collective operations like all-reduce.

**MAYA:** That's actually pretty elegant. No single point of failure, and you can scale horizontally just by adding more processes.

**ERIC:** It is elegant, and it works really well for SPMD workloads. But it has limitations. Because there's no central coordinator, it's hard to implement more complex patterns. Every process needs to know the full execution plan upfront.

**MAYA:** And I'm guessing that makes dynamic or heterogeneous workloads difficult?

**ERIC:** Exactly. If you want process A to send data to process B, but only sometimes, based on some runtime condition—that gets complicated fast in a multi-controller world.

**MAYA:** So what's the alternative? A single controller that orchestrates everything?

**ERIC:** That's the other extreme. TensorFlow 1.x actually worked somewhat like this, with a central coordinator managing the dataflow graph. But the problem is that a single controller becomes a bottleneck at scale.

**MAYA:** If every operation needs to check in with the controller, you're limited by how fast that controller can make decisions.

**ERIC:** Right. And when you're running on thousands of TPUs, that controller would need to make millions of scheduling decisions per second. It just doesn't scale.

**MAYA:** So Pathways is trying to get the best of both worlds? The flexibility of single-controller coordination with the scalability of distributed execution?

**ERIC:** That's exactly it. And the key insight is separating the control plane from the data plane.

## Control Plane vs Data Plane

**MAYA:** Control plane and data plane—those terms come from networking, right?

**ERIC:** Yes! In networking, the control plane decides where packets should go, while the data plane actually moves the packets. Pathways applies the same separation to ML computation.

**MAYA:** So the control plane in Pathways decides what computations should happen and where, while the data plane actually executes those computations?

**ERIC:** Exactly. And here's the clever part—the control plane can run ahead of the data plane. It can make scheduling decisions for future operations even while current operations are still executing.

**MAYA:** Oh, that's interesting. So while TPU number 47 is crunching through a matrix multiplication, the control plane is already figuring out what TPU 47 should do next?

**ERIC:** Right. And not just what it should do next, but what it should do ten steps from now. The control plane builds up a queue of work for each accelerator.

**MAYA:** That sounds like buffering or pipelining in the control logic itself.

**ERIC:** Exactly—they call it buffered dispatch. The control plane dispatches operations to accelerators well before they're needed, so the accelerators always have work queued up and ready to go.

**MAYA:** But wait, how can you schedule future operations if you don't know the results of current ones? Don't you have data dependencies?

**ERIC:** Great question! This is where futures come in. In Pathways, computations don't pass around actual data—they pass around futures, which are essentially promises of data that will exist in the future.

## Futures and Asynchronous Execution

**MAYA:** Futures—like in concurrent programming? A placeholder for a value that will be computed eventually?

**ERIC:** Exactly. When the control plane schedules an operation, it doesn't wait for the inputs to be ready. It just says "this operation will consume the future from operation A and produce a new future that operation C will consume."

**MAYA:** So the control plane is essentially building up a graph of dependencies without waiting for actual values?

**ERIC:** Right. The control plane races ahead, building and scheduling the computation graph. Meanwhile, the data plane follows behind, actually executing operations as their input futures become ready.

**MAYA:** That's elegant. The control plane is never blocked waiting for data, so it can scale to handle massive graphs.

**ERIC:** And because the control plane has scheduled work in advance, the accelerators don't have to wait for scheduling decisions. They just pull work from their queues as soon as their current computation finishes.

**MAYA:** How far ahead can the control plane get? Is there a limit?

**ERIC:** In practice, they found that a few steps of lookahead is usually enough to hide the scheduling latency. The key is that the control plane is fast enough to stay ahead of the data plane.

**MAYA:** What happens when there's a genuine data dependency that affects control flow? Like, what if you need to check if a loss has converged before deciding whether to continue training?

**ERIC:** That's when the control plane has to wait. But those checkpoints are relatively rare in most ML workloads. The vast majority of operations have predictable dependencies that can be scheduled in advance.

**MAYA:** So for the steady-state of training—the forward pass, backward pass, optimizer step—the control plane can stay way ahead?

**ERIC:** Exactly. And that's where most of the compute time goes anyway.

## The Single Controller Model

**MAYA:** Let's talk more about why they chose a single-controller model. You mentioned scalability concerns—how do they address those?

**ERIC:** The key insight is that the control plane operations are very lightweight compared to the data plane operations. Scheduling a matrix multiplication takes microseconds. Actually executing it takes milliseconds.

**MAYA:** So even though there's a single controller, it's not a bottleneck because its work is so much faster than the actual computation?

**ERIC:** Right. And they do shard the controller across multiple machines, so it's not literally a single process. But logically, there's one coordinator that sees the whole computation graph.

**MAYA:** What are the benefits of having that global view?

**ERIC:** Several things. First, it's much easier to implement complex parallelism strategies. The controller can see all the resources and all the work, so it can make globally optimal decisions.

**MAYA:** Like deciding which operations to co-locate to minimize communication?

**ERIC:** Exactly. Or deciding when to prefetch data, or how to schedule pipeline stages to minimize bubbles. With a multi-controller system, each process only sees its local view.

**MAYA:** And you mentioned it's easier to experiment with new parallelism patterns?

**ERIC:** Yes! In a multi-controller system, implementing a new parallelism strategy often means changing code on every process and making sure they all coordinate correctly. In Pathways, you just change the controller's scheduling logic.

**MAYA:** That sounds like a huge win for research velocity. You can prototype new ideas without a massive engineering effort.

**ERIC:** That's exactly the motivation. Google wants to explore new architectures that might mix different parallelism strategies in novel ways. Having a flexible control plane makes that exploration tractable.

## Gang Scheduling

**MAYA:** The paper mentions gang scheduling. What's that about?

**ERIC:** Gang scheduling is about launching parallel operations together, as a group. When you have an SPMD computation that needs to run across 2048 TPUs, you want all of them to start at roughly the same time.

**MAYA:** Why does that matter? Can't they just start whenever they're ready?

**ERIC:** The problem is collective operations. When you do an all-reduce, every participant needs to reach that point before anyone can proceed. If one TPU starts late, everyone else has to wait.

**MAYA:** Oh right, the slowest member determines the speed of the whole collective.

**ERIC:** Exactly. So you want to launch the whole gang together, minimizing the skew between when different TPUs start the same operation.

**MAYA:** How does Pathways achieve that?

**ERIC:** The controller tracks the state of all accelerators and waits until the entire gang is ready before dispatching the next operation. But because of the buffered dispatch we discussed, it can queue up multiple operations in advance.

**MAYA:** So the gang scheduling happens at dispatch time, not execution time?

**ERIC:** Right. The controller waits for all TPUs to be ready to receive the next batch of work, then dispatches to all of them together. The actual execution then proceeds in lockstep because everyone received the same work at the same time.

**MAYA:** What about when you have heterogeneous computations? Different TPUs doing different things?

**ERIC:** That's where Pathways really shines. The controller can manage multiple gangs doing different work, and coordinate data transfers between them. It's like conducting an orchestra where different sections are playing different parts.

**MAYA:** Beautiful analogy. The conductor—the control plane—ensures everyone comes in at the right time.

## Resource Management and TPU Pods

**ERIC:** Let's talk about the actual hardware Pathways is designed for. Google's TPU infrastructure is organized into pods and islands.

**MAYA:** I've heard about TPU pods. Those are the collections of TPUs connected by high-speed interconnects, right?

**ERIC:** Right. A TPU v4 pod can have up to 4096 chips, all connected by a high-bandwidth mesh network. Within a pod, communication is very fast—hundreds of gigabytes per second between neighboring chips.

**MAYA:** That's incredible bandwidth. I assume that's important for all-reduce operations?

**ERIC:** Crucial. When you're doing data parallel training, you need to sum gradients across all devices. Fast interconnects make that feasible even at massive scale.

**MAYA:** You mentioned islands—what are those?

**ERIC:** Islands are groups of TPUs that might be in different pods or even different data centers. The interconnect between islands is slower—it's data center networking rather than the dedicated TPU mesh.

**MAYA:** So Pathways needs to handle both fast intra-pod communication and slower inter-island communication?

**ERIC:** Exactly. And the controller needs to be smart about placing computations. You want operations that communicate frequently to be in the same pod if possible.

**MAYA:** That sounds like a scheduling optimization problem—placing computations to minimize communication costs.

**ERIC:** It is, and it's a hard one. The paper discusses how Pathways handles this, but there's definitely room for more sophisticated placement strategies.

**MAYA:** How does Pathways interact with the resource manager? Who decides which TPUs a job gets?

**ERIC:** Pathways interfaces with Google's cluster management system. When you launch a Pathways job, you request a certain number of TPU cores, and the resource manager allocates them from available pools.

**MAYA:** Can a single Pathways job span multiple pods or islands?

**ERIC:** Yes! That's actually one of the key capabilities. A single logical computation can span thousands of TPUs across multiple islands, with Pathways coordinating all the data movement.

## The Client and Compilation

**MAYA:** How do users actually program Pathways? What does the interface look like?

**ERIC:** Pathways is designed to work with JAX, which is Google's NumPy-like library for accelerated computing. Users write JAX code, and it gets compiled and executed on Pathways.

**MAYA:** So JAX is the frontend, and Pathways is the backend that actually runs the computation?

**ERIC:** Exactly. JAX code gets compiled to XLA, which is a compiler for linear algebra operations. Then Pathways takes the XLA computation and figures out how to distribute it across the available TPUs.

**MAYA:** Does the user have to specify how to parallelize their code, or does Pathways figure it out automatically?

**ERIC:** It's a mix. For standard SPMD workloads, JAX has primitives like pmap and pjit that let users specify how arrays should be sharded across devices. Pathways respects those specifications.

**MAYA:** What about more complex parallelism patterns?

**ERIC:** That's where things get interesting. Pathways can handle arbitrary dataflow graphs, so users can express pipeline parallelism, expert parallelism, or even custom patterns that don't fit into standard categories.

**MAYA:** Expert parallelism—is that like mixture of experts models where different experts are on different devices?

**ERIC:** Exactly! In a mixture of experts model, you might have hundreds of expert sub-networks, each on different TPUs. Tokens get routed to different experts based on a gating function. Pathways can handle that routing and the heterogeneous computation it implies.

**MAYA:** That's a great example of why you'd want something more flexible than pure SPMD.

## Pipeline Parallelism in Pathways

**ERIC:** Let's talk about how Pathways handles pipeline parallelism specifically. This is one of the benchmarks they show in the paper.

**MAYA:** Pipeline parallelism is where you split the model into stages and pass activations between them, right? Like an assembly line?

**ERIC:** Exactly. Stage one processes microbatch one, then passes it to stage two while starting on microbatch two. Everyone's working in parallel on different microbatches.

**MAYA:** We talked about this a lot in the Megatron episode. The challenge is minimizing pipeline bubbles—those idle times when stages are waiting for work.

**ERIC:** Right. And Pathways can implement the same interleaved schedules that Megatron uses. But because of the single-controller model, it's easier to experiment with different schedules.

**MAYA:** How does Pathways express pipeline parallelism? Is it built into the system, or does the user specify it?

**ERIC:** The user specifies which parts of the model go on which devices, and Pathways handles the coordination. The key is that Pathways sees the whole graph, so it can schedule the pipeline stages efficiently.

**MAYA:** And the asynchronous dispatch helps here too, I assume?

**ERIC:** Absolutely. The control plane can schedule several microbatches' worth of operations in advance. Each stage knows exactly what work is coming and can execute without waiting for real-time scheduling decisions.

**MAYA:** What performance do they report for pipeline parallelism?

**ERIC:** They show that Pathways achieves comparable throughput to dedicated SPMD implementations, even for 16-stage pipelines. That's impressive because pipeline parallelism adds coordination overhead.

**MAYA:** So the asynchronous control plane successfully hides that overhead?

**ERIC:** Exactly. The accelerators see a steady stream of work, just like they would in an SPMD setup.

## Multi-Island Training

**MAYA:** You mentioned that Pathways can span multiple islands. How does that work in practice?

**ERIC:** This is one of the more challenging scenarios. When your computation spans multiple data centers, the communication latency jumps from microseconds to milliseconds.

**MAYA:** That's three orders of magnitude slower! How do you hide that latency?

**ERIC:** The key is computation-communication overlap. While one island is waiting for data from another, it can be working on other computations.

**MAYA:** But doesn't that require careful scheduling to have useful work available during those waits?

**ERIC:** It does, and that's where the single-controller model helps. The controller can see the whole graph and schedule operations to maximize overlap.

**MAYA:** What kinds of workloads benefit from multi-island training?

**ERIC:** Any workload that's too big for a single pod, or workloads where you want to use specialized hardware in different locations. For example, you might have vision TPUs in one island and language model TPUs in another.

**MAYA:** And Pathways coordinates the whole thing as a single logical computation?

**ERIC:** Exactly. From the user's perspective, it's one program running on one system. Pathways handles all the distributed complexity.

## Performance Results

**MAYA:** Let's dig into the performance numbers. What benchmarks do they report?

**ERIC:** The headline result is that Pathways achieves essentially 100% accelerator utilization for SPMD workloads on up to 2048 TPUs. That matches dedicated SPMD implementations.

**MAYA:** Wait, I would have expected some overhead from the single-controller coordination. How do they achieve full utilization?

**ERIC:** The buffered dispatch is key. Because operations are queued in advance, the accelerators never stall waiting for scheduling. The control plane overhead is completely hidden.

**MAYA:** What about the more complex patterns like pipeline parallelism?

**ERIC:** For a 16-stage pipeline, they achieve throughput within a few percent of the theoretical optimum. The asynchronous dataflow successfully hides the coordination overhead.

**MAYA:** And multi-island training?

**ERIC:** They show that Pathways can efficiently utilize TPUs across two islands connected by data center networking. The throughput is lower than single-island, of course, but it's still practical for workloads that need that scale.

**MAYA:** What's the latency like for the control plane? How fast can it schedule operations?

**ERIC:** The paper reports that the control plane can dispatch millions of operations per second. That's fast enough to stay ahead of even the fastest accelerator computations.

**MAYA:** Impressive. What about fault tolerance? With thousands of TPUs, failures must be common.

**ERIC:** The paper doesn't go deep into fault tolerance, but the architecture supports checkpointing and recovery. The single-controller model actually helps here because there's a consistent view of the computation state.

## Comparison with Other Systems

**MAYA:** How does Pathways compare to systems like Megatron and DeepSpeed that we've covered in previous episodes?

**ERIC:** They're solving overlapping but different problems. Megatron and DeepSpeed are optimized frameworks for training large language models. They have specific parallelism strategies baked in.

**MAYA:** Like tensor parallelism and ZeRO-style data parallelism?

**ERIC:** Exactly. Those systems are incredibly well-optimized for their target workloads. If you're training a standard Transformer at scale, they're probably your best bet.

**MAYA:** Where does Pathways offer advantages?

**ERIC:** Flexibility. If you want to try a new parallelism strategy, or train a model architecture that doesn't fit the standard patterns, Pathways gives you a foundation to build on.

**MAYA:** It's more like infrastructure than a framework?

**ERIC:** That's a good way to put it. Pathways is the orchestration layer that frameworks could build on top of. It handles the hard problems of distributed scheduling so researchers can focus on ML innovation.

**MAYA:** What about compared to TensorFlow or PyTorch?

**ERIC:** Those are more like end-to-end ML platforms. They include everything from automatic differentiation to model serving. Pathways is narrower—it's specifically about distributed execution.

**MAYA:** Does Pathways replace TensorFlow at Google?

**ERIC:** Not exactly. JAX, which runs on Pathways, has become the preferred framework for many Google ML teams. But TensorFlow is still widely used, especially in production serving.

## The Broader Vision

**MAYA:** The paper talks about enabling "new systems and ML research ideas." What do they have in mind?

**ERIC:** One vision is what they call sparsely activated models. Instead of running the whole model on every input, you dynamically select which parts to activate.

**MAYA:** Like mixture of experts, but maybe even more extreme?

**ERIC:** Exactly. Imagine a model with thousands of specialized components, and each input only activates a small fraction of them. That requires dynamic, heterogeneous computation that's hard to express in SPMD frameworks.

**MAYA:** And Pathways' flexible scheduling would help with that?

**ERIC:** Right. The control plane can handle the dynamic routing and ensure that the right experts are activated for each input.

**MAYA:** What about multi-modal models? Those seem like another case where you'd want heterogeneous computation.

**ERIC:** Definitely. A model that processes text, images, and audio might want different architectures for each modality. Pathways can coordinate computation across specialized subnetworks.

**MAYA:** This seems related to the Google Brain paper on Pathways the system is named after—the vision of a single model that can do many tasks?

**ERIC:** Exactly. Jeff Dean and others have written about moving toward more general AI systems that can handle diverse tasks. That requires infrastructure that can support diverse computation patterns.

## Design Trade-offs

**MAYA:** Every system has trade-offs. What are the downsides of the Pathways approach?

**ERIC:** The single-controller model, while flexible, does add complexity. You need careful engineering to ensure the control plane doesn't become a bottleneck.

**MAYA:** And there's probably higher latency for starting new computations compared to multi-controller systems?

**ERIC:** Yes, the initial setup time is higher because the controller needs to analyze the graph and plan the execution. For long-running training jobs, that's amortized away. For short tasks, it might matter.

**MAYA:** What about portability? Pathways seems very tied to TPU infrastructure.

**ERIC:** That's true. Many of the design decisions are optimized for TPU characteristics—the mesh interconnect, the synchronous execution model, the tight integration with XLA.

**MAYA:** Could similar ideas be applied to GPU clusters?

**ERIC:** In principle, yes. But GPUs have different characteristics—more heterogeneous workloads, different memory hierarchies, different interconnect topologies. You'd need to adapt the design.

**MAYA:** Are there open-source implementations of Pathways-like systems?

**ERIC:** Not directly, but JAX itself is open source, and projects like Alpa are exploring similar ideas for GPU clusters. The concepts in Pathways are influencing the broader ecosystem.

## Lessons for Practitioners

**MAYA:** What should ML practitioners take away from this paper?

**ERIC:** First, the importance of separating control plane from data plane. Even if you're not building a system like Pathways, thinking about scheduling and execution separately can clarify your design.

**MAYA:** And the buffered dispatch idea—staying ahead of the computation?

**ERIC:** Right. Any time you have latency you can predict, queuing work in advance is a powerful technique. It applies to prefetching, pipelining, all sorts of optimization.

**MAYA:** What about the choice between single-controller and multi-controller architectures?

**ERIC:** That depends on your workload. If you're doing standard SPMD, multi-controller is simpler and scales well. If you need flexibility for heterogeneous workloads, a single controller gives you more options.

**MAYA:** Any advice for people designing distributed training systems?

**ERIC:** Profile your control plane overhead. It's easy to focus on computation time and ignore scheduling latency, but at scale, that can become the bottleneck.

**MAYA:** And instrument your collective operations. Those are often where scaling breaks down.

**ERIC:** Exactly. Understanding where time goes is the first step to optimization.

## The Legacy of Pathways

**MAYA:** As we wrap up, what's the lasting impact of this work?

**ERIC:** Pathways represents a shift in how we think about ML infrastructure. It's not just about making existing workloads faster—it's about enabling new kinds of computation.

**MAYA:** Moving from "how do we train Transformers faster" to "how do we support whatever architectures researchers dream up."

**ERIC:** Right. As models get more complex and diverse, we need infrastructure that can keep up. Pathways is a step in that direction.

**MAYA:** And the ideas are spreading beyond Google?

**ERIC:** Yes. The JAX ecosystem, which builds on similar concepts, is growing rapidly. And other frameworks are adopting ideas like asynchronous dispatch and flexible parallelism.

**MAYA:** Any predictions for where this goes next?

**ERIC:** I think we'll see more systems that blur the line between training and inference. Models that learn and adapt in real-time, using dynamic computation patterns. Pathways-like infrastructure is a prerequisite for that.

**MAYA:** An exciting future! Thanks for this deep dive, Eric.

**ERIC:** My pleasure. This paper is a great example of how systems research enables ML research. Neither can advance without the other.

**MAYA:** That's all for today's episode of Strollcast. We covered Pathways, Google's asynchronous distributed dataflow system for ML—from the control plane architecture to gang scheduling to the vision of flexible, heterogeneous computation.

**ERIC:** If you enjoyed this episode, check out our previous ones on Megatron-LM, FSDP, and ZeRO. Together, they paint a picture of how the industry is tackling large-scale training.

**MAYA:** Until next time, keep strolling.

**ERIC:** And may your futures always resolve!
