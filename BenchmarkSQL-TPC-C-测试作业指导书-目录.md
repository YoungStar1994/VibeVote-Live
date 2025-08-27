## BenchmarkSQL TPC-C 测试作业指导书（目录大纲）

### 0. 文档概述
- **目标与范围**: 指导工程师基于 BenchmarkSQL 对各类数据库执行 TPC-C 压测。
- **读者对象**: 数据库工程师、性能测试工程师、SRE/DevOps。
- **前置条件**: 基本的数据库运维与 Linux 使用经验，具备被测数据库环境。

### 1. BenchmarkSQL 安装与使用、硬件与并发/仓库推荐
- **1.1 BenchmarkSQL 简介与适用场景**
- **1.2 环境与前置要求**
  - JDK、Maven/Gradle、JDBC 驱动
  - 被测数据库网络连通与账户权限
- **1.3 推荐机器配置（压测机/客户端）**
  - 单机数据库推荐（vCPU、内存、磁盘、网络）
  - 分布式数据库推荐（小型/中型/大型集群规模下的压测机数量与规格）
  - 网络与系统内核参数建议（RPS/TPS 目标值映射）
- **1.4 并发终端（terminals）与仓库（warehouses）推荐值**
  - 单机数据库：terminals 与 vCPU 的经验比值；warehouses 与数据量/日志能力的匹配
  - 分布式数据库：按分片/Region/节点规模分级给出 terminals 与 warehouses 建议区间
  - 常见瓶颈识别与回退策略（IO、日志、锁、网络）
- **1.5 安装与构建**
  - 下载源码与目录结构说明
  - 编译与产物
  - 放置 JDBC 驱动
- **1.6 首次运行流程（快速开始）**
  - 配置 props 文件
  - 初始化 schema 与装载数据
  - 建索引、收集统计信息
  - 预热与正式压测

### 2. 使用：兼容与非兼容数据库的测试流程
- **2.1 兼容数据库的标准测试步骤**
  - PostgreSQL、MySQL、Oracle、SQL Server（示例以 PG/MySQL 展示）
  - 准备数据库与账户、创建 schema
  - 修改对应 props.* 文件
  - 执行建表/装载/索引/Analyze（如适用）
  - 预热、压测、收尾与数据清理
- **2.2 非兼容数据库改造与适配指南**
  - JDBC 驱动与连接 URL 适配
  - DDL/序列/自增/时间函数差异适配
  - SQL 方言与分页/字符串/时间类函数替换
  - 事务隔离级别/自动提交/批处理差异
  - 需要调整的典型文件与位置（属性文件、方言 SQL、初始化脚本）
  - 最小改动集与二次打包发布
- **2.3 常见问题与排障（连接、权限、字符集、时区、时延）**

### 3. BenchmarkSQL 参数优化
- **3.1 BenchmarkSQL 核心工作负载参数**
  - warehouses、terminals、runMins、rampUp、thinkTime/keyingTime
  - 事务权重（New-Order/Payment/Order-Status/Delivery/Stock-Level）
  - batchCommit、useStoredProcedures、fetchSize 等
- **3.2 负载设计与阶段性策略**
  - 预热/爬坡/稳定/回落/恢复阶段
  - 阶段指标观察与拐点定位
- **3.3 数据库侧关键参数与优化要点（按类型分述）**
  - 连接池/最大连接、语句缓存
  - 日志/WAL/重做、检查点/刷盘策略
  - 缓存/Buffer、统计信息、执行计划稳定性
  - 分布式系统：副本、分区/分片、事务仲裁与网络
- **3.4 调参方法论与验证**
  - 单因素/正交试验、回归与基线对比
  - 置信区间、重复性与随机因子控制

### 4. 压测机与数据库的资源监控
- **4.1 压测机（客户端）监控**
  - CPU/内存/GC、线程与文件句柄
  - 常用工具：top/vmstat/iostat/pidstat/sar/dstat/jstat/jcmd
- **4.2 数据库节点监控**
  - 系统层：CPU、IO、网络、上下文切换、负载
  - 数据库层：QPS/TPS、延迟、锁等待、缓存命中、WAL/Redo、慢 SQL
  - PostgreSQL: pg_stat_activity/pg_stat_statements/检查点与WAL
  - MySQL: performance_schema/sys、InnoDB 指标
  - 分布式指标：Region/Shard 热点、复制延迟、事务冲突
- **4.3 可观测性平台**
  - Prometheus + Grafana（Node/Process/DB Exporter）
  - 日志统一采集与基线归档
- **4.4 监控面板与告警建议**

### 5. 配置文件与参数说明
- **5.1 目录结构与关键文件**
  - run/、sql.common/、sql.<dialect>/、props.*、日志输出位置
- **5.2 props.* 通用参数解释**
  - 连接配置：driver、conn、user、password
  - 负载配置：warehouses、terminals、runMins、rampUp、wait/thinkTime
  - 事务与权重：newOrderWeight、paymentWeight 等
  - 数据准备：create、load、index、analyze
  - 运行控制：batchCommit、useStoredProcedures、fetchSize、logInterval
- **5.3 各数据库样例与差异点**
  - props.pg、props.mysql、props.ora、props.mssql 关键项说明
- **5.4 常见配置错误与校验清单**

### 附录
- **A. 术语表（Terminals、Warehouses、Ramp-up、Think Time 等）**
- **B. 样例命令与脚本模板**
- **C. 版本兼容性与已知限制**
- **D. 参考资料与最佳实践**
